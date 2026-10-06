# CodeLive

Real-time collaborative coding and execution platform tailored for live coding sessions, technical interviews, and classroom environments.

## Backend Architecture
- **Framework:** ASP.NET Core Web API (.NET 9)
- **Real-Time Presence & Permissions:** SignalR Hub (`/hubs/collaboration`)
- **CRDT Synchronization Relay:** WebSocket Binary Relay (`/ws/yjs`)
- **Code Execution:** Judge0 CE REST API integration
