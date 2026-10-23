# CodeLive

Real-time collaborative coding & execution platform — **Angular 19** + **ASP.NET Core 9**.

```
backend/CodeLive.Api   ASP.NET Core: SignalR hub, Yjs WebSocket relay, Judge0 execution
frontend               Angular 19 standalone app: Monaco + Yjs, Xterm.js, SignalR
```

## Run locally

Prerequisites: .NET 9 SDK, Node 20+.

```bash
# 1. Backend  -> http://localhost:5000
cd backend/CodeLive.Api
dotnet run

# 2. Frontend -> http://localhost:4200
cd frontend
npm install
npm start
```

Open http://localhost:4200, create a room as **Lecturer**, then open the copied link in another
browser/incognito window and join as **Student**.

## Configuration

- `backend/CodeLive.Api/appsettings.json`
  - `Judge0:BaseUrl` (default `https://ce.judge0.com`), `Judge0:ApiKey` (sent as `X-Auth-Token` if set)
  - `Cors:Origins` – allowed frontend origins
- `frontend/src/app/models.ts` – `environment` with backend URLs (hub / Yjs WebSocket).

## Architecture notes

| Concern                                                | Transport                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Rooms, presence, permissions, run code, share terminal | SignalR `/hubs/collaboration`                                                 |
| Editor text (CRDT) + shared language                   | Yjs over raw binary WebSocket `/ws/yjs?room={id}`                             |
| Code execution                                         | `Judge0ExecutionService` → `POST /submissions?base64_encoded=false&wait=true` |

- The Yjs relay is stateless: it forwards each binary frame to the other peers in the room; the
  Yjs clients perform sync between themselves. When everyone leaves, the document is gone.
- Monaco is loaded via its AMD build (copied to `/assets/monaco/vs`), and the Yjs ⇄ Monaco
  binding lives in `src/app/services/monaco-binding.ts` (same approach as `y-monaco`, which
  cannot be bundled cleanly by Angular's esbuild builder because it imports Monaco's ESM/CSS).
- Edit permissions are enforced in the UI (Monaco `readOnly`); lecturer-only hub methods are
  validated server-side.
- Shortcut: `Ctrl/Cmd + Enter` runs the code.
