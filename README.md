# mor-diem-sdk

**Developer tools for [Morpheus AI](https://mor.org).**

## What is this?

Morpheus requires their [Morpheus Node](https://github.com/MorpheusAIs/Morpheus-Lumerin-Node/releases) binary. Using it directly means dealing with hex model IDs and manual session management.

**mor-diem-sdk provides:**

| Component | What It Does |
|-----------|--------------|
| **Proxy** | Human model names (`kimi-k2.5` not `0xbb9e...`), auto session management |
| **CLI** | Interactive chat, model testing, wallet setup |
| **SDK** | TypeScript API for wallets, balances, inference |
| **Setup script** | Downloads Morpheus Node for you |

## Quick Start

```bash
# 1. Install
bun install

# 2. Download Morpheus Node
bun run setup

# 3. Start Morpheus Node (separate terminal)
~/.morpheus/proxy-router

# 4. Start mor-diem-sdk proxy
bun run proxy

# 5. Run CLI
bun run cli
```

## Architecture

```
Your App → mor-diem-sdk proxy (8083) → Morpheus Node (9081) → AI Providers
                  ↓
         - Model name mapping
         - Auto session management
         - Auth handling
```

**Morpheus Node:** Download with `bun run setup` or manually from [releases](https://github.com/MorpheusAIs/Morpheus-Lumerin-Node/releases).

---

## CLI Commands

```bash
bun run cli              # Setup wizard + chat
bun run cli chat         # Interactive chat
bun run cli models       # List available models
bun run cli wallet balance   # Check balances
bun run cli complete "Hello" # Quick inference test
```

## SDK Usage

```typescript
import { MorDiemSDK } from 'mor-diem-sdk'

const sdk = new MorDiemSDK({
  mnemonic: process.env.MOR_MNEMONIC,
})

const response = await sdk.complete('Hello')
```

## Model Status

**37 models available.** Recommended:

| Model | Speed |
|-------|-------|
| `venice-uncensored` | ~350ms |
| `mistral-31-24b` | ~500ms |
| `qwen3-coder-480b-a35b-instruct` | ~680ms |
| `kimi-k2.5` | ~2s |

Add `:web` suffix for web search variants.

## Configuration

| Variable | Description |
|----------|-------------|
| `MOR_MNEMONIC` | BIP39 seed phrase |
| `MOR_PRIVATE_KEY` | Private key (alternative) |
| `MORPHEUS_ROUTER_URL` | Morpheus Node URL (default: `http://localhost:9081`) |

## Documentation

- [Architecture](docs/architecture.md)
- [Staking Guide](docs/staking.md)
- [Troubleshooting](docs/troubleshooting.md)

## Tests

```bash
bun test
```

## License

UNLICENSED
