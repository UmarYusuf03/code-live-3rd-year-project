import { Injectable, OnDestroy, signal } from "@angular/core";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { environment, LanguageId, Role } from "../models";
import { MonacoBinding } from "./monaco-binding";
import { SNIPPETS } from "../snippets";

/**
 * Owns the Y.Doc for a room. Provided at RoomComponent level so a fresh doc
 * is created per room and destroyed when leaving.
 */
@Injectable()
export class YjsCollaborationService implements OnDestroy {
  private doc?: Y.Doc;
  private provider?: WebsocketProvider;
  private binding?: MonacoBinding;
  private seedTimer?: ReturnType<typeof setTimeout>;

  readonly connected = signal(false);
  readonly language = signal<LanguageId>("javascript");

  get text(): Y.Text | undefined {
    return this.doc?.getText("code");
  }

  connect(roomId: string, role: Role) {
    this.destroy();
    const doc = (this.doc = new Y.Doc());
    // y-websocket builds `${serverUrl}/${room}?params` -> /ws/yjs/?room=<id>
    this.provider = new WebsocketProvider(environment.yjsUrl, "", doc, {
      params: { room: roomId },
    });
    this.provider.on("status", (e: { status: string }) =>
      this.connected.set(e.status === "connected"),
    );

    const meta = doc.getMap<string>("meta");
    meta.observe(() => {
      const lang = meta.get("language") as LanguageId | undefined;
      if (lang) this.language.set(lang);
    });

    // The relay server is stateless: if no peer answers within a moment, the lecturer seeds the doc.
    if (role === "lecturer") {
      this.seedTimer = setTimeout(() => {
        if (doc.getText("code").length === 0) {
          doc.transact(() => {
            if (!meta.get("language")) meta.set("language", "javascript");
            doc
              .getText("code")
              .insert(
                0,
                SNIPPETS.find((s) => s.language === this.language())!.code,
              );
          });
        }
      }, 1200);
    }
  }

  setLanguage(lang: LanguageId) {
    this.language.set(lang);
    this.doc?.getMap<string>("meta").set("language", lang);
  }

  bindEditor(editor: any, monaco: any) {
    this.binding?.destroy();
    if (!this.text) return;
    this.binding = new MonacoBinding(this.text, editor.getModel(), monaco);
  }

  getCode(): string {
    return this.text?.toString() ?? "";
  }

  destroy() {
    clearTimeout(this.seedTimer);
    this.binding?.destroy();
    this.provider?.destroy();
    this.doc?.destroy();
    this.binding = this.provider = this.doc = undefined;
    this.connected.set(false);
  }

  ngOnDestroy() {
    this.destroy();
  }
}
