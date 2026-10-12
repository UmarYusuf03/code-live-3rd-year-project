import { Injectable, inject, signal } from "@angular/core";
import { Subject } from "rxjs";
import { SignalRService } from "./signalr.service";
import { YjsCollaborationService } from "./yjs-collaboration.service";
import { ExecutionResult, LANGUAGES } from "../models";

export type TerminalEvent =
  | { kind: "running"; language: string }
  | { kind: "result"; result: ExecutionResult }
  | { kind: "shared"; from: string; output: string }
  | { kind: "info"; message: string };

/** Room-scoped glue between navbar, editor, terminal and snippet panel. */
@Injectable()
export class WorkspaceService {
  readonly running = signal(false);
  readonly snippetsOpen = signal(false);
  readonly terminal$ = new Subject<TerminalEvent>();
  /** Plain-text transcript of the local terminal, used for "Share Terminal". */
  lastOutput = "";
  editor: any = null;

  constructor(
    private readonly signalR: SignalRService,
    private readonly yjs: YjsCollaborationService,
  ) {}

  async run() {
    if (this.running()) return;
    const lang = LANGUAGES.find((l) => l.id === this.yjs.language())!;
    this.running.set(true);
    this.terminal$.next({ kind: "running", language: lang.label });
    try {
      const result = await this.signalR.runCode(this.yjs.getCode(), lang.id);
      this.lastOutput = `$ run ${lang.label}\n${result.output}`;
      this.terminal$.next({ kind: "result", result });
    } catch (e: any) {
      const result = {
        output: e?.message ?? "Execution failed",
        isError: true,
        status: "Error",
      };
      this.lastOutput = result.output;
      this.terminal$.next({ kind: "result", result });
    } finally {
      this.running.set(false);
    }
  }

  insertSnippet(code: string) {
    const ed = this.editor;
    if (
      !ed ||
      ed.getOption((window as any).monaco.editor.EditorOption.readOnly)
    )
      return;
    const selection = ed.getSelection();
    ed.executeEdits("snippet", [
      { range: selection, text: code, forceMoveMarkers: true },
    ]);
    ed.focus();
  }
}
