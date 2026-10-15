import {
  Injector,
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  signal,
  viewChild,
} from "@angular/core";
import { SignalRService } from "../../services/signalr.service";
import { YjsCollaborationService } from "../../services/yjs-collaboration.service";
import { WorkspaceService } from "../../services/workspace.service";
import { loadMonaco } from "../../services/monaco-loader";
import { LANGUAGES } from "../../models";

@Component({
  selector: "app-editor",
  standalone: true,
  template: `
    <div class="wrap">
      <div class="host" #host></div>
      @if (loading()) {
        <div class="overlay">Loading editor…</div>
      }
      @if (!loading() && !signalR.canEditEffective()) {
        <div class="ro">
          🔒 Read-only — waiting for the lecturer to grant edit access
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .wrap {
      position: relative;
      height: 100%;
      background: #0d1117;
    }
    .host {
      position: absolute;
      inset: 0;
    }
    .overlay {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: var(--muted);
    }
    .ro {
      position: absolute;
      right: 14px;
      bottom: 10px;
      z-index: 5;
      font-size: 12px;
      color: var(--muted);
      background: rgba(21, 26, 35, 0.92);
      border: 1px solid var(--border);
      padding: 5px 10px;
      border-radius: 8px;
      pointer-events: none;
    }
  `,
})
export class EditorComponent implements AfterViewInit, OnDestroy {
  private readonly host =
    viewChild.required<ElementRef<HTMLDivElement>>("host");

  readonly loading = signal(true);
  private readonly editorReady = signal(false);
  private editor: any;
  private monaco: any;

  constructor(
    readonly signalR: SignalRService,
    private readonly yjs: YjsCollaborationService,
    private readonly workspace: WorkspaceService,
    private readonly injector: Injector,
  ) {
    // Permission-driven read-only toggle.
    effect(() => {
      const editable = this.signalR.canEditEffective();
      if (this.editorReady())
        this.editor.updateOptions({ readOnly: !editable });
    }, { injector: this.injector });
    // Shared language selection (stored in the Y.Doc meta map).
    effect(() => {
      const lang = LANGUAGES.find((l) => l.id === this.yjs.language())!;
      if (this.editorReady())
        this.monaco.editor.setModelLanguage(
          this.editor.getModel(),
          lang.monacoId,
        );
    }, { injector: this.injector });
  }

  async ngAfterViewInit() {
    this.monaco = await loadMonaco();
    this.monaco.editor.defineTheme("codelive-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0d1117",
        "editorLineNumber.foreground": "#3b4252",
        "editor.lineHighlightBackground": "#161b22",
      },
    });

    this.editor = this.monaco.editor.create(this.host().nativeElement, {
      value: "",
      language: "javascript",
      theme: "codelive-dark",
      automaticLayout: true,
      fontFamily: "'JetBrains Mono', Consolas, monospace",
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      tabSize: 2,
      readOnly: true,
      padding: { top: 12 },
    });

    this.editor.addCommand(
      this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.Enter,
      () => this.workspace.run(),
    );

    this.yjs.bindEditor(this.editor, this.monaco);
    this.workspace.editor = this.editor;
    this.loading.set(false);
    this.editorReady.set(true);
  }

  ngOnDestroy() {
    this.workspace.editor = null;
    this.editor?.getModel()?.dispose();
    this.editor?.dispose();
  }
}
