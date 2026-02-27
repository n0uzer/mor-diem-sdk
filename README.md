
<h2 align="center">mor-diem-sdk</h2>

<p align="center">
  <strong>Stake MOR tokens, get AI. That's it.</strong>
</p>

<p align="center">
  <img src="assets/mor-diem.png" alt="mor-diem-sdk" width="600">
</p>

## Why this exists

You want to use [Morpheus AI](https://mor.org). To do that, you stake MOR tokens on **Base** chain for a session (7 days, fully refundable).

Morpheus's node requires hex model IDs, manual session management, and cookie auth. **mor-diem-sdk handles all of that** so you can just:

```typescript
const response = await sdk.complete('Hello')
```

**This is NOT:**
- The Morpheus gateway (api.mor.org) - that's pay-per-use USD
- The Lumerin router - that's the heavy 56MB binary
- A consumer node - that's Morpheus infrastructure

**This IS:**
- A drop-in OpenAI-compatible proxy
- Auto session/staking management
- Wallet tools and CLI

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/anthropics/mor-diem-sdk
cd mor-diem-sdk && bun install

# 2. Download Morpheus Node (required, ~56MB)
bun run setup

# 3. Start Morpheus Node (separate terminal)
~/.morpheus/proxy-router

# 4. Start the proxy
bun run proxy

# 5. Run CLI
bun run cli
```

The CLI walks you through wallet setup. You need:
- ETH on Base (for gas, ~$0.01)
- MOR tokens (for staking, refundable after 7 days)

## How it works

```
Your App
    ↓
mor-diem-sdk proxy (:8083)
  - Converts "kimi-k2.5" → hex model ID
  - Auto-opens staking sessions
  - Handles auth
    ↓
Morpheus Node (:9081)
  - Connects to P2P network
  - Routes to AI providers
    ↓
AI Response
```

## SDK Usage

```typescript
import { MorDiemSDK } from 'mor-diem-sdk'

const sdk = new MorDiemSDK({
  mnemonic: process.env.MOR_MNEMONIC,
})

// Check balances
const balances = await sdk.getBalances()
console.log(`MOR: ${balances.morFormatted}`)

// Chat
const response = await sdk.complete('Explain quantum computing')
```

## CLI Commands

```bash
bun run cli              # Setup + chat
bun run cli chat         # Chat
bun run cli models       # List models
bun run cli wallet balance
```

## Models

37 models available. Recommended:

| Model | Speed |
|-------|-------|
| `venice-uncensored` | ~350ms |
| `mistral-31-24b` | ~500ms |
| `qwen3-coder-480b-a35b-instruct` | ~680ms |
| `kimi-k2.5` | ~2s |

## Configuration

| Variable | Description |
|----------|-------------|
| `MOR_MNEMONIC` | Your wallet seed phrase |
| `MORPHEUS_ROUTER_URL` | Morpheus Node URL (default: localhost:9081) |

## Chain

Everything happens on **Base** (Coinbase L2). You need:
- ETH on Base for gas
- MOR tokens on Base for staking

## Docs

- [Staking Guide](docs/staking.md)
- [Architecture](docs/architecture.md)
- [Troubleshooting](docs/troubleshooting.md)

## License

UNLICENSED
