# AGENTS.md - mor-diem-sdk

See **[CLAUDE.md](./CLAUDE.md)** for full context.

## The Two Pieces

| Piece | Port | Repo | What It Does |
|-------|------|------|--------------|
| **OpenAI Translator** | 8083 | mor-diem-sdk (this repo) | Converts OpenAI API → Morpheus format |
| **Morpheus Node** | 8082 (HTTP), 9081 (TCP) | [Lumerin binary](https://github.com/MorpheusAIs/Morpheus-Lumerin-Node/releases) (external) | Connects to P2P, stakes MOR |

```
┌─────────────────────────────────┐
│ Your App Process                │
│  Your Code → SDK → Translator   │ ──→ Morpheus Node HTTP API (8082) → AI Providers
│         (all mor-diem-sdk)      │            ↑
└─────────────────────────────────┘      external binary (~56MB)
```

## Connection

```bash
MORPHEUS_ROUTER_URL=http://localhost:8082  # HTTP API port (NOT 9081!)
```

**IMPORTANT PORT CONFUSION:**
- **8082** = HTTP API (what we connect to)
- **9081** = TCP/P2P protocol (NOT HTTP - will fail if you hit it with HTTP)

**No public Morpheus Node exists.** Users either:
1. Download and run the [Morpheus Node](https://github.com/MorpheusAIs/Morpheus-Lumerin-Node/releases) locally
2. Use [api.mor.org](https://api.mor.org) instead (pay USD, skip mor-diem-sdk entirely)

## Build

```bash
bun install
bun run setup   # Download Morpheus Node to ./bin/morpheus/
bun run start   # Start both node and proxy
bun run stop    # Stop everything
bun test
```
