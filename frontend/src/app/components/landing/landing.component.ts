import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { Role } from "../../models";

export const SESSION_KEY = "codelive.session";

function randomRoomId(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const pick = (n: number) =>
    Array.from(
      crypto.getRandomValues(new Uint8Array(n)),
      (b) => chars[b % chars.length],
    ).join("");
  return `${pick(3)}-${pick(4)}-${pick(3)}`;
}

@Component({
  selector: "app-landing",
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <div class="glow"></div>
      <form class="card" (ngSubmit)="join()">
        <div class="brand"><span class="logo">&lt;/&gt;</span> CodeLive</div>
        <p class="sub">
          Real-time collaborative coding for classrooms & interviews.
        </p>

        <label
          >Display name
          <input
            name="name"
            [(ngModel)]="name"
            placeholder="e.g. Ada Lovelace"
            maxlength="40"
            required
            autofocus
          />
        </label>

        <div class="roles">
          @for (r of roles; track r.id) {
            <button
              type="button"
              class="role"
              [class.active]="role() === r.id"
              (click)="role.set(r.id)"
            >
              <strong>{{ r.label }}</strong
              ><span>{{ r.hint }}</span>
            </button>
          }
        </div>

        <label
          >Room ID
          <input
            name="room"
            [(ngModel)]="roomId"
            placeholder="abc-defg-hij"
            maxlength="64"
          />
        </label>

        @if (error()) {
          <div class="error">{{ error() }}</div>
        }

        <div class="actions">
          <button type="submit" class="primary">Join Room</button>
          <button type="button" (click)="create()">Create New Room</button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .wrap {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }
    .glow {
      position: absolute;
      width: 640px;
      height: 640px;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.25;
      background: radial-gradient(circle, var(--accent), transparent 60%);
      top: -200px;
      right: -160px;
    }
    .card {
      position: relative;
      width: 100%;
      max-width: 420px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
    }
    .brand {
      font-size: 24px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo {
      font-family: var(--mono);
      font-size: 15px;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      padding: 6px 8px;
      border-radius: 8px;
      color: #fff;
    }
    .sub {
      margin: -8px 0 4px;
      color: var(--muted);
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 12px;
      color: var(--muted);
      font-weight: 500;
    }
    .roles {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .role {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      text-align: left;
      padding: 12px;
      span {
        font-size: 11.5px;
        color: var(--muted);
      }
      &.active {
        border-color: var(--accent);
        background: rgba(124, 92, 255, 0.12);
      }
    }
    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 4px;
      button {
        padding: 10px;
      }
    }
    .error {
      color: #fca5a5;
      font-size: 12.5px;
    }
  `,
})
export class LandingComponent {
  readonly roles: { id: Role; label: string; hint: string }[] = [
    { id: "lecturer", label: "Lecturer", hint: "Host & control editing" },
    { id: "student", label: "Student", hint: "Join & follow along" },
  ];

  name = "";
  roomId = "";
  readonly role = signal<Role>("lecturer");
  readonly error = signal<string | null>(null);

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    this.roomId = this.route.snapshot.queryParamMap.get("room") ?? "";
    this.role.set(this.roomId ? "student" : "lecturer");
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        this.name = JSON.parse(saved).name ?? "";
      } catch {
        /* ignore */
      }
    }
  }

  create() {
    this.roomId = randomRoomId();
    this.role.set("lecturer");
    this.join();
  }

  join() {
    const name = this.name.trim();
    const room = this.roomId.trim().toLowerCase();
    if (!name) return this.error.set("Please enter your display name.");
    if (!/^[a-z0-9-]{3,64}$/.test(room))
      return this.error.set("Enter a valid Room ID or create a new room.");
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ name, role: this.role() }),
    );
    this.router.navigate(["/room", room]);
  }
}
