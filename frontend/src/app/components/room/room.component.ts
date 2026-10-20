import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SignalRService } from "../../services/signalr.service";
import { YjsCollaborationService } from "../../services/yjs-collaboration.service";
import { WorkspaceService } from "../../services/workspace.service";
import { NavbarComponent } from "../navbar/navbar.component";
import { SidebarComponent } from "../sidebar/sidebar.component";
import { EditorComponent } from "../editor/editor.component";
import { TerminalComponent } from "../terminal/terminal.component";
import { SnippetPanelComponent } from "../snippet-panel/snippet-panel.component";
import { SESSION_KEY } from "../landing/landing.component";
import { Role } from "../../models";

@Component({
  selector: "app-room",
  standalone: true,
  imports: [
    NavbarComponent,
    SidebarComponent,
    EditorComponent,
    TerminalComponent,
    SnippetPanelComponent,
  ],
  providers: [YjsCollaborationService, WorkspaceService],
  template: `
    <div class="layout" [class.with-snippets]="workspace.snippetsOpen()">
      <app-navbar class="nav" [roomId]="roomId" />
      <app-sidebar class="side" />
      <main class="main">
        @if (signalR.error(); as err) {
          <div class="toast" (click)="signalR.error.set(null)">
            {{ err }} <span>✕</span>
          </div>
        }
        <app-editor class="editor" />
        <app-terminal class="terminal" />
      </main>
      @if (workspace.snippetsOpen()) {
        <app-snippet-panel class="snippets" />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100vh;
    }
    .layout {
      height: 100%;
      display: grid;
      grid-template-columns: 260px 1fr;
      grid-template-rows: 56px 1fr;
      grid-template-areas: "nav nav" "side main";
    }
    .layout.with-snippets {
      grid-template-columns: 260px 1fr 300px;
      grid-template-areas: "nav nav nav" "side main snippets";
    }
    .nav {
      grid-area: nav;
    }
    .side {
      grid-area: side;
      min-height: 0;
    }
    .snippets {
      grid-area: snippets;
      min-height: 0;
    }
    .main {
      grid-area: main;
      display: grid;
      grid-template-rows: minmax(0, 1fr) minmax(180px, 34%);
      min-width: 0;
      min-height: 0;
      position: relative;
    }
    .editor,
    .terminal {
      min-height: 0;
      min-width: 0;
    }
    .toast {
      position: absolute;
      z-index: 10;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      cursor: pointer;
      background: #3b1517;
      color: #fecaca;
      border: 1px solid #7f1d1d;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      span {
        margin-left: 10px;
        opacity: 0.7;
      }
    }
    @media (max-width: 900px) {
      .layout,
      .layout.with-snippets {
        grid-template-columns: 1fr;
        grid-template-rows: 56px auto 1fr;
        grid-template-areas: "nav" "side" "main";
      }
      .snippets {
        display: none;
      }
    }
  `,
})
export class RoomComponent implements OnInit, OnDestroy {
  roomId = "";

  constructor(
    readonly signalR: SignalRService,
    readonly workspace: WorkspaceService,
    private readonly yjs: YjsCollaborationService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  async ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get("id") ?? "";
    let session: { name: string; role: Role } | null = null;
    try {
      session = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
    } catch {
      /* ignore */
    }

    if (!session?.name) {
      this.router.navigate(["/"], { queryParams: { room: this.roomId } });
      return;
    }

    this.yjs.connect(this.roomId, session.role);
    try {
      await this.signalR.joinRoom(this.roomId, session.name, session.role);
    } catch (e) {
      console.error(e);
    }
  }

  ngOnDestroy() {
    this.signalR.leave();
  }
}
