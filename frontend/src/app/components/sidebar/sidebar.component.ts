import { Component, computed, inject } from "@angular/core";
import { SignalRService } from "../../services/signalr.service";
import { Participant } from "../../models";

@Component({
  selector: "app-sidebar",
  standalone: true,
  template: `
    <aside>
      <div class="head">
        <h3>Participants</h3>
        <span class="count">{{ signalR.participants().length }}</span>
      </div>
      @if (signalR.globalEdit()) {
        <div class="notice">Global edit is ON — everyone can edit.</div>
      }
      <ul>
        @for (p of signalR.participants(); track p.connectionId) {
          <li [class.me]="p.connectionId === myId()">
            <div class="avatar" [style.background]="color(p.name)">
              {{ p.name.charAt(0).toUpperCase() }}
            </div>
            <div class="info">
              <div class="name">
                {{ p.name }}
                @if (p.connectionId === myId()) {
                  <span class="you">(you)</span>
                }
              </div>
              <div class="badges">
                @if (p.role === "lecturer") {
                  <span class="badge host">Host · Lecturer</span>
                } @else {
                  <span class="badge">Student</span>
                }
                @if (
                  p.role === "student" && (p.canEdit || signalR.globalEdit())
                ) {
                  <span class="badge edit">Can Edit</span>
                }
              </div>
            </div>
<!-- permission buttons placeholder -->
          </li>
        } @empty {
          <li class="empty">Connecting…</li>
        }
      </ul>
    </aside>
  `,
  styles: `
    aside {
      height: 100%;
      background: var(--panel);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 8px;
    }
    h3 {
      margin: 0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }
    .count {
      font-size: 11px;
      background: var(--panel-2);
      border: 1px solid var(--border);
      padding: 1px 8px;
      border-radius: 999px;
      color: var(--muted);
    }
    .notice {
      margin: 0 12px 8px;
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 8px;
      background: rgba(34, 197, 94, 0.08);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.25);
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 4px 8px 12px;
      overflow-y: auto;
    }
    li {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      border-radius: 8px;
      &:hover {
        background: var(--panel-2);
      }
      &.me {
        background: rgba(124, 92, 255, 0.07);
      }
    }
    .avatar {
      width: 32px;
      height: 32px;
      flex: none;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-weight: 700;
      color: #fff;
      font-size: 13px;
    }
    .info {
      flex: 1;
      min-width: 0;
    }
    .name {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .you {
      color: var(--muted);
      font-weight: 400;
      font-size: 12px;
    }
    .badges {
      display: flex;
      gap: 4px;
      margin-top: 3px;
      flex-wrap: wrap;
    }
    .empty {
      color: var(--muted);
      justify-content: center;
    }
  `,
})
export class SidebarComponent {
  readonly myId = computed(() => this.signalR.self()?.connectionId);

  constructor(readonly signalR: SignalRService) {}

  grant(p: Participant) {
    this.signalR.grantEdit(p.connectionId).catch(() => {});
  }
  revoke(p: Participant) {
    this.signalR.revokeEdit(p.connectionId).catch(() => {});
  }

  color(name: string): string {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `hsl(${h} 55% 45%)`;
  }
}
