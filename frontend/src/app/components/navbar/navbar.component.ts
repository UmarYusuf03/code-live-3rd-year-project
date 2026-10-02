import { Component, inject, input, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { SignalRService } from "../../services/signalr.service";
import { YjsCollaborationService } from "../../services/yjs-collaboration.service";
import { WorkspaceService } from "../../services/workspace.service";
import { LANGUAGES, LanguageId } from "../../models";

@Component({
  selector: "app-navbar",
  standalone: true,
  imports: [RouterLink],
  template: `
    <header>
      <a class="brand" routerLink="/"><span class="logo">&lt;/&gt;</span> CodeLive</a>
      <div class="room">
        <span class="dot" [class]="signalR.status()" [title]="'Server: ' + signalR.status() + ' / Sync: ' + (yjs.connected() ? 'connected' : 'offline')"></span>
        <span class="id">{{ roomId() }}</span>
        <button class="sm ghost" (click)="copyLink()">{{ copied() ? '✓ Copied' : '⧉ Copy link' }}</button>
      </div>

      <div class="spacer"></div>

      @if (signalR.isLecturer()) {
        <label class="switch" title="Allow every student to edit">
          <input type="checkbox" [checked]="signalR.globalEdit()" (change)="toggleGlobal($event)" />
          <span class="track"></span><span class="lbl">Global Edit</span>
        </label>
      } @else {
        <span class="badge" [class.edit]="signalR.canEditEffective()">{{ signalR.canEditEffective() ? 'You can edit' : 'Read-only' }}</span>
      }

      <button class="ghost" (click)="workspace.snippetsOpen.set(!workspace.snippetsOpen())">&lt;/&gt; Snippets</button>

      <select [value]="yjs.language()" (change)="setLanguage($event)" [disabled]="!signalR.canEditEffective()">
        @for (l of languages; track l.id) { <option [value]="l.id">{{ l.label }}</option> }
      </select>

      <button class="success" (click)="workspace.run()" [disabled]="workspace.running() || signalR.status() !== 'connected'">
        {{ workspace.running() ? 'Running…' : '▶ Run Code' }}
      </button>
    </header>
  `,
  styles: `
    header {
      height: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 16px;
      background: var(--bg-elev);
      border-bottom: 1px solid var(--border);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 16px;
      color: var(--text);
      text-decoration: none;
    }
    .logo {
      font-family: var(--mono);
      font-size: 11px;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      padding: 4px 6px;
      border-radius: 6px;
      color: #fff;
    }
    .room {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-left: 12px;
      border-left: 1px solid var(--border);
    }
    .id {
      font-family: var(--mono);
      font-size: 13px;
      color: var(--muted);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--danger);
      &.connected {
        background: var(--success);
      }
      &.connecting,
      &.reconnecting {
        background: var(--warning);
      }
    }
    .spacer {
      flex: 1;
    }
    .lbl {
      font-size: 13px;
    }
    select {
      padding: 6px 10px;
    }
    @media (max-width: 700px) {
      .room .id,
      .lbl {
        display: none;
      }
    }
  `,
})
export class NavbarComponent {
  readonly roomId = input.required<string>();
  readonly languages = LANGUAGES;
  readonly copied = signal(false);

  constructor(
    readonly signalR: SignalRService,
    readonly yjs: YjsCollaborationService,
    readonly workspace: WorkspaceService,
  ) {}

  async copyLink() {
    await navigator.clipboard.writeText(
      `${location.origin}/room/${this.roomId()}`,
    );
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }

  toggleGlobal(e: Event) {
    const input = e.target as HTMLInputElement;
    this.signalR
      .toggleGlobalEdit(input.checked)
      .catch(() => (input.checked = this.signalR.globalEdit()));
  }

  setLanguage(e: Event) {
    this.yjs.setLanguage((e.target as HTMLSelectElement).value as LanguageId);
  }
}
