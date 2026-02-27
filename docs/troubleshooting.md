# Troubleshooting

## Quick Reference

| Error | Cause | Fix |
|-------|-------|-----|
| `overflow (0x11)` | MAX_UINT256 allowance | Set allowance to 10,000 MOR |
| `invalid basic auth` | No `.cookie` file | Run router to generate it |
| `ECONNREFUSED` | Proxy/router not running | Start both services |
| `Unknown model` | Typo or not synced | Check `/v1/models` |
| `Session unavailable` | Low MOR or no approval | Check balance, re-approve |
| `Invalid mnemonic` | Bad seed phrase | 12/24 words, BIP39 wordlist |
| `Insufficient funds` | No ETH or MOR | Bridge ETH, swap for MOR |
| `Request timed out` | Slow P2P | Use faster model, retry |

---

## Overflow Error

```
panic: arithmetic underflow or overflow (0x11)
```

Cause: Allowance = MAX_UINT256. Router calls `increaseAllowance()`, overflows.

Fix:
```bash
bun run cli wallet approve 10000000000000000000000
```

---

## Auth Error (Stale Cookie)

```
invalid basic auth provided
```

**This is the most common issue.** The cookie goes stale when:
- Morpheus Node restarts
- Node session expires
- Cookie file gets corrupted

**Good news:** The SDK auto-detects stale cookies and retries with a fresh read. If you still see this error:

**Fix - regenerate the cookie:**
```bash
# 1. Stop everything
bun run stop

# 2. Delete stale cookie
rm ./bin/morpheus/.cookie

# 3. Restart everything
bun run start
```

**Verify cookie exists:**
```bash
cat ./bin/morpheus/.cookie
```

Cookie location (checked in order):
1. `$MORPHEUS_COOKIE_PATH` (if set in .env)
2. `./bin/morpheus/.cookie` (default for local setup)

---

## Connection Refused

Cause: Services not running.

Fix:
```bash
bun run start  # Starts both Morpheus Node and proxy
```

Or manually:
```bash
cd bin/morpheus && ./proxy-router &  # HTTP on 8082, TCP on 9081
bun run proxy &                      # Port 8083
```

Verify:
```bash
curl http://localhost:8083/health    # SDK proxy
curl http://localhost:8082/swagger/  # Morpheus Node HTTP API
```

**Common mistake:** Trying to hit port 9081 with HTTP. Port 9081 is TCP/P2P, not HTTP. Use port 8082 for HTTP API.

---

## Session Issues

**"Session unavailable"** - Check:
1. MOR balance > 5 MOR
2. MOR approved for Diamond contract
3. ETH > 0.01 for gas

**"Session expired"** - SDK auto-renews. If persists, restart proxy.

---

## Wallet Issues

**"Invalid mnemonic"**
- Exactly 12 or 24 words
- BIP39 wordlist only
- Single spaces, no extra whitespace

**"Insufficient funds"**
- Bridge ETH: https://bridge.base.org
- Swap MOR: https://app.uniswap.org (Base)
- Minimum: 0.01 ETH + 5 MOR

---

## Ports

| Port | Service | Protocol |
|------|---------|----------|
| 8083 | SDK Proxy (OpenAI-compatible) | HTTP |
| 8082 | Morpheus Node HTTP API | HTTP |
| 9081 | Morpheus Node P2P/TCP | TCP (not HTTP!) |

**Critical:** The SDK connects to port 8082, not 9081. If you're getting "socket connection was closed unexpectedly", check your `MORPHEUS_ROUTER_URL` is set to `http://localhost:8082`.

---

## Environment Variables

```bash
# Required
MOR_MNEMONIC="word1 word2 ... word12"

# Optional
MOR_WALLET_INDEX=0
MOR_RPC_URL=https://mainnet.base.org
MOR_BASE_URL=http://127.0.0.1:8083
MORPHEUS_PROXY_PORT=8083
MORPHEUS_ROUTER_URL=http://localhost:8082  # HTTP API, not 9081!
MORPHEUS_COOKIE_PATH=/absolute/path/to/bin/morpheus/.cookie
MORPHEUS_SESSION_DURATION=604800
MORPHEUS_RENEW_BEFORE=3600

# Alchemy RPC (for better reliability)
ALCHEMY_API_KEY=your-key-here
```

**Note:** `MORPHEUS_COOKIE_PATH` must be an absolute path if you set it manually.

---

## Chain Confusion

Morpheus runs on **Base** (chain ID 8453), not Arbitrum.

If you see contract errors or "chain mismatch", check:
1. Your wallet is on Base network
2. MOR token address: `0x7431aDa8a591C955a994a21710752EF9b882b8e3` (Base)
3. Diamond contract: `0x6aBE1d282f72B474E54527D93b979A4f64d3030a` (Base)

---

## Only 9 Models Showing (Should be 37)

This usually means you're hitting the TCP port instead of HTTP.

**Check:** `MORPHEUS_ROUTER_URL` should be `http://localhost:8082` not `http://localhost:9081`.

The 8082 port is HTTP API, 9081 is TCP protocol.

---

## RPC Rate Limiting

If you see "429 Too Many Requests" or rate limit errors, add an Alchemy key:

1. Get free key from [alchemy.com](https://alchemy.com)
2. Add to `.env`: `ALCHEMY_API_KEY=your-key`
3. Setup will configure Morpheus Node to use it
