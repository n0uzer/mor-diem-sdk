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

**Fix - regenerate the cookie:**
```bash
# 1. Kill everything
pkill -f proxy-router

# 2. Delete stale cookie
rm ~/.morpheus/.cookie

# 3. Restart Morpheus Node (regenerates cookie)
~/.morpheus/proxy-router &
sleep 5

# 4. Restart proxy
bun run proxy &
```

**Verify cookie exists:**
```bash
cat ~/.morpheus/.cookie
```

Cookie location:
1. `$MORPHEUS_COOKIE_PATH` (if set)
2. `~/.morpheus/.cookie` (default)

---

## Connection Refused

Cause: Services not running.

Fix:
```bash
./morpheus-router &  # Port 9081
bun run proxy &      # Port 8083
```

Verify:
```bash
curl http://localhost:8083/health
curl http://localhost:9081/swagger/
```

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

| Port | Service |
|------|---------|
| 8083 | Proxy (OpenAI API) |
| 9081 | Router (blockchain) |
| 9082 | Router (inference) |

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
MORPHEUS_ROUTER_URL=http://localhost:9081
MORPHEUS_SESSION_DURATION=604800
MORPHEUS_RENEW_BEFORE=3600
```
