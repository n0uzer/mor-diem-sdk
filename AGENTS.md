# AGENTS.md - mor-diem-sdk

See **[CLAUDE.md](./CLAUDE.md)** for full context.

## The Two Pieces

| Piece | Port | Repo | What It Does |
|-------|------|------|--------------|
| **OpenAI Translator** | 8083 | mor-diem-sdk (this repo) | Converts OpenAI API → Morpheus format |
| **Morpheus Node** | 9081 | [Lumerin binary](https://github.com/MorpheusAIs/Morpheus-Lumerin-Node/releases) (external) | Connects to P2P, stakes MOR |

```
┌─────────────────────────────────┐
│ Your App Process                │
│  Your Code → SDK → Translator   │ ──→ Morpheus Node (9081) → AI Providers
│         (all mor-diem-sdk)      │            ↑
└─────────────────────────────────┘      external binary (~56MB)
```

## Connection

```bash
MORPHEUS_ROUTER_URL=http://localhost:9081  # default - run node locally
MORPHEUS_ROUTER_URL=http://1.2.3.4:9081    # point to remote (if you have one)
```

**No public Morpheus Node exists.** Users either:
1. Download and run the [Morpheus Node](https://github.com/MorpheusAIs/Morpheus-Lumerin-Node/releases) locally
2. Use [api.mor.org](https://api.mor.org) instead (pay USD, skip mor-diem-sdk entirely)

## Build

```bash
bun install
bun run build
bun test
```
