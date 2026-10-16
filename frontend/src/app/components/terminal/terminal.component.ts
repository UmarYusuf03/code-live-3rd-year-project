import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { Subscription } from "rxjs";
import { SignalRService } from "../../services/signalr.service";
import {
  TerminalEvent,
  WorkspaceService,
} from "../../services/workspace.service";

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[38;2;248;113;113m",
  green: "\x1b[38;2;74;222;128m",
  yellow: "\x1b[38;2;251;191;36m",
  cyan: "\x1b[38;2;34;211;238m",
  violet: "\x1b[38;2;167;139;250m",
};

@Component({
  selector: "app-terminal",
  standalone: true,
  template: `
    <section>
      <div class="bar">
        <span class="title">Terminal</span>
        @if (status(); as s) {
          <span class="status" [class]="s.cls">{{ s.text }}</span>
        }
        <div class="spacer"></div>
        @if (signalR.isLecturer()) {
          <button class="sm" (click)="share()" [disabled]="!hasOutput()">
            {{ shared() ? "✓ Shared" : "📡 Share Terminal" }}
          </button>
        }
        <button class="sm ghost" (click)="clear()">Clear</button>
      </div>
      <div class="term" #host></div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    section {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #07090d;
      border-top: 1px solid var(--border);
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      background: var(--bg-elev);
      border-bottom: 1px solid var(--border);
    }
    .title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      font-weight: 600;
    }
    .status {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--border);
      &.ok {
        color: #86efac;
        border-color: rgba(34, 197, 94, 0.35);
      }
      &.err {
        color: #fca5a5;
        border-color: rgba(239, 68, 68, 0.4);
      }
      &.run {
        color: #fcd34d;
        border-color: rgba(245, 158, 11, 0.4);
      }
      &.shared {
        color: #a5f3fc;
        border-color: rgba(34, 211, 238, 0.4);
      }
    }
    .spacer {
      flex: 1;
    }
    .term {
      flex: 1;
      min-height: 0;
      padding: 6px 0 0 10px;
    }
  `,
})
export class TerminalComponent implements AfterViewInit, OnDestroy {
  private readonly host =
    viewChild.required<ElementRef<HTMLDivElement>>("host");

  readonly status = signal<{ text: string; cls: string } | null>(null);
  readonly hasOutput = signal(false);
  readonly shared = signal(false);

  constructor(
    readonly signalR: SignalRService,
    private readonly workspace: WorkspaceService,
  ) {}

  private term?: Terminal;
  private fit = new FitAddon();
  private resizeObserver?: ResizeObserver;
  private subs = new Subscription();

  ngAfterViewInit() {
    this.term = new Terminal({
      convertEol: true,
      disableStdin: true,
      cursorBlink: false,
      fontFamily: "'JetBrains Mono', Consolas, monospace",
      fontSize: 13,
      scrollback: 5000,
      theme: {
        background: "#07090d",
        foreground: "#d6dbe5",
        cursor: "#07090d",
        selectionBackground: "#2a3142",
      },
    });
    this.term.loadAddon(this.fit);
    this.term.open(this.host().nativeElement);
    this.safeFit();
    this.resizeObserver = new ResizeObserver(() => this.safeFit());
    this.resizeObserver.observe(this.host().nativeElement);

    this.term.writeln(
      `${C.violet}${C.bold}CodeLive terminal${C.reset} ${C.dim}— press Run Code or Ctrl+Enter${C.reset}`,
    );

    this.subs.add(this.workspace.terminal$.subscribe((e) => this.handle(e)));
    this.subs.add(
      this.signalR.sharedTerminalOutput$.subscribe((s) =>
        this.handle({ kind: "shared", from: s.from, output: s.output }),
      ),
    );
  }

  private handle(e: TerminalEvent) {
    const t = this.term!;
    switch (e.kind) {
      case "running":
        t.writeln(
          `\r\n${C.cyan}$${C.reset} run ${C.bold}${e.language}${C.reset} ${C.dim}…${C.reset}`,
        );
        this.status.set({ text: "Running", cls: "run" });
        break;
      case "result": {
        const color = e.result.isError ? C.red : C.reset;
        t.write(color + e.result.output + C.reset);
        const compile = /compil/i.test(e.result.status);
        const label = e.result.isError
          ? `✗ ${e.result.status || "Error"}`
          : "✓ Finished";
        t.writeln(`${e.result.isError ? C.red : C.green}${label}${C.reset}`);
        this.status.set({
          text: compile
            ? "Compile error"
            : e.result.isError
              ? e.result.status || "Error"
              : "Success",
          cls: e.result.isError ? "err" : "ok",
        });
        this.hasOutput.set(true);
        break;
      }
      case "shared":
        t.writeln(`\r\n${C.yellow}── Shared by ${e.from} ──${C.reset}`);
        t.writeln(e.output);
        t.writeln(`${C.yellow}────────────${C.reset}`);
        this.status.set({ text: `Shared by ${e.from}`, cls: "shared" });
        break;
      case "info":
        t.writeln(`${C.dim}${e.message}${C.reset}`);
        break;
    }
    t.scrollToBottom();
  }

  async share() {
    try {
      await this.signalR.shareTerminal(this.workspace.lastOutput);
      this.shared.set(true);
      setTimeout(() => this.shared.set(false), 1500);
    } catch {
      /* surfaced via error toast */
    }
  }

  clear() {
    this.term?.clear();
    this.status.set(null);
  }

  private safeFit() {
    try {
      this.fit.fit();
    } catch {
      /* element not visible yet */
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.resizeObserver?.disconnect();
    this.term?.dispose();
  }
}
