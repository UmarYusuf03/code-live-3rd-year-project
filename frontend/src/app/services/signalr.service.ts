import { Injectable, computed, signal } from "@angular/core";
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { Subject } from "rxjs";
import {
  environment,
  ExecutionResult,
  Participant,
  Role,
  RoomState,
  SharedTerminal,
} from "../models";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

@Injectable({ providedIn: "root" })
export class SignalRService {
  private hub?: HubConnection;
  private session?: { roomId: string; name: string; role: Role };

  readonly status = signal<ConnectionStatus>("disconnected");
  readonly participants = signal<Participant[]>([]);
  readonly globalEdit = signal(false);
  readonly canEdit = signal(false);
  readonly self = signal<Participant | null>(null);
  readonly error = signal<string | null>(null);
  readonly sharedTerminalOutput$ = new Subject<SharedTerminal>();

  readonly isLecturer = computed(() => this.self()?.role === "lecturer");
  /** Final edit permission used by the editor. */
  readonly canEditEffective = computed(
    () => this.isLecturer() || this.canEdit() || this.globalEdit(),
  );

  async joinRoom(roomId: string, name: string, role: Role): Promise<void> {
    this.session = { roomId, name, role };
    if (!this.hub) this.hub = this.build();

    if (this.hub.state === HubConnectionState.Disconnected) {
      this.status.set("connecting");
      try {
        await this.hub.start();
      } catch (e) {
        this.status.set("disconnected");
        this.error.set("Could not connect to the CodeLive server.");
        throw e;
      }
      this.status.set("connected");
    }
    await this.hub.invoke("JoinRoom", roomId, name, role);
  }

  async leave(): Promise<void> {
    this.session = undefined;
    const hub = this.hub;
    this.hub = undefined;
    this.participants.set([]);
    this.self.set(null);
    this.globalEdit.set(false);
    this.canEdit.set(false);
    this.status.set("disconnected");
    await hub?.stop();
  }

  toggleGlobalEdit(enabled: boolean) {
    return this.invoke("ToggleGlobalEdit", this.roomId, enabled);
  }

  grantEdit(connectionId: string) {
    return this.invoke("GrantEdit", this.roomId, connectionId);
  }

  revokeEdit(connectionId: string) {
    return this.invoke("RevokeEdit", this.roomId, connectionId);
  }

  runCode(code: string, language: string): Promise<ExecutionResult> {
    return this.invoke<ExecutionResult>("RunCode", code, language);
  }

  shareTerminal(output: string) {
    return this.invoke("ShareTerminal", this.roomId, output);
  }

  private get roomId(): string {
    return this.session?.roomId ?? "";
  }

  private async invoke<T = void>(
    method: string,
    ...args: unknown[]
  ): Promise<T> {
    if (!this.hub || this.hub.state !== HubConnectionState.Connected)
      throw new Error("Not connected to server.");
    try {
      return await this.hub.invoke<T>(method, ...args);
    } catch (e: any) {
      const msg = String(e?.message ?? e).replace(/^.*HubException:\s*/, "");
      this.error.set(msg);
      throw new Error(msg);
    }
  }

  private build(): HubConnection {
    const hub = new HubConnectionBuilder()
      .withUrl(environment.hubUrl, { withCredentials: true })
      .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
      .configureLogging(LogLevel.Warning)
      .build();

    hub.on("RoomState", (state: RoomState) => {
      this.self.set(state.self);
      this.globalEdit.set(state.globalEdit);
      this.applyParticipants(state.participants);
    });
    hub.on("ParticipantsUpdated", (list: Participant[]) =>
      this.applyParticipants(list),
    );
    hub.on("GlobalEditChanged", (enabled: boolean) =>
      this.globalEdit.set(enabled),
    );
    hub.on("EditPermissionChanged", (canEdit: boolean) =>
      this.canEdit.set(canEdit),
    );
    hub.on("SharedTerminalOutput", (payload: SharedTerminal) =>
      this.sharedTerminalOutput$.next(payload),
    );

    hub.onreconnecting(() => this.status.set("reconnecting"));
    hub.onreconnected(async () => {
      this.status.set("connected");
      // A new connection id is issued on reconnect, so re-register in the room.
      if (this.session)
        await hub.invoke(
          "JoinRoom",
          this.session.roomId,
          this.session.name,
          this.session.role,
        );
    });
    hub.onclose(() => this.status.set("disconnected"));
    return hub;
  }

  private applyParticipants(list: Participant[]) {
    this.participants.set(list);
    const me = list.find((p) => p.connectionId === this.hub?.connectionId);
    if (me) {
      this.self.set(me);
      this.canEdit.set(me.canEdit);
    }
  }
}
