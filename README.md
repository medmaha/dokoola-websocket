# WebSocket Communication Server (Go)

This project implements a real-time WebSocket communication server in Go, supporting peer-to-peer voice/video calls, chat messaging, user presence, and session management. It is inspired by the provided architecture and feature set.

## Structure
- `cmd/` — Main entrypoint
- `internal/` — Application logic (controllers, storage, infrastructure)
- `pkg/` — Shared types and utilities
- `Dockerfile` — Containerization
- `README.md` — Documentation

## Quick Start
1. Copy your `.env` file with configuration (see README for details)
2. Build: `go build -o websocket-server ./cmd/server`
3. Run: `./websocket-server`

---

See README.md for full documentation and usage.
