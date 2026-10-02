import { Component, computed, inject, signal } from "@angular/core";
import { SignalRService } from "../../services/signalr.service";
import { YjsCollaborationService } from "../../services/yjs-collaboration.service";
import { WorkspaceService } from "../../services/workspace.service";
import { SNIPPETS, Snippet } from "../../snippets";
import { LANGUAGES, LanguageId } from "../../models";

@Component({
  selector: "app-snippet-panel",
  standalone: true,
  template: `
    <aside>
      <div class="head">
        <h3>Snippets</h3>
        <button class="sm ghost" (click)="workspace.snippetsOpen.set(false)">
          ✕
        </button>
      </div>
      <div class="tabs">
        @for (l of languages; track l.id) {
          <button
            class="sm"
            [class.active]="filter() === l.id"
            (click)="filter.set(l.id)"
          >
            {{ l.label }}
          </button>
        }
      </div>
      @if (!signalR.canEditEffective()) {
        <p class="hint">You need edit access to insert snippets.</p>
      }
      <ul>
        @for (s of visible(); track s.title + s.language) {
          <li>
            <div class="row">
              <strong>{{ s.title }}</strong>
              <button
                class="sm primary"
                [disabled]="!signalR.canEditEffective()"
                (click)="insert(s)"
              >
                Insert
              </button>
            </div>
            <pre>{{ s.code }}</pre>
          </li>
        }
      </ul>
    </aside>
  `,
  styles: `
    aside {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--panel);
      border-left: 1px solid var(--border);
      overflow: hidden;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px 6px;
    }
    h3 {
      margin: 0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }
    .tabs {
      display: flex;
      gap: 6px;
      padding: 4px 14px 10px;
      button.active {
        border-color: var(--accent);
        background: rgba(124, 92, 255, 0.15);
      }
    }
    .hint {
      margin: 0 14px 8px;
      font-size: 12px;
      color: var(--muted);
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0 12px 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    li {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg-elev);
      overflow: hidden;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
    }
    pre {
      margin: 0;
      padding: 8px 10px;
      max-height: 140px;
      overflow: auto;
      font: 11.5px/1.5 var(--mono);
      color: #b9c1d3;
      background: #0d1117;
      border-top: 1px solid var(--border);
    }
  `,
})
export class SnippetPanelComponent {
  readonly languages = LANGUAGES;
  readonly filter = signal<LanguageId>("javascript");
  readonly visible = computed(() =>
    SNIPPETS.filter((s) => s.language === this.filter()),
  );

  constructor(
    readonly signalR: SignalRService,
    readonly workspace: WorkspaceService,
    private readonly yjs: YjsCollaborationService,
  ) {
    this.filter.set(this.yjs.language());
  }

  insert(s: Snippet) {
    if (this.yjs.language() !== s.language) this.yjs.setLanguage(s.language);
    this.workspace.insertSnippet(s.code);
  }
}
