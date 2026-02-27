/**
 * Proxy Tests
 *
 * Tests the OpenAI session proxy endpoints.
 * Requires proxy to be running: bun run proxy
 */

import { beforeAll, describe, expect, test } from 'bun:test'

const PROXY_URL = process.env.MOR_BASE_URL || 'http://127.0.0.1:8083'

describe('Proxy Endpoints', () => {
	let proxyAvailable = false

	beforeAll(async () => {
		try {
			const res = await fetch(`${PROXY_URL}/health`, { signal: AbortSignal.timeout(2000) })
			proxyAvailable = res.ok
		} catch {
			proxyAvailable = false
		}

		if (!proxyAvailable) {
			console.log('\n⚠️  Proxy not running - skipping proxy tests')
			console.log('   Start with: bun run proxy\n')
		}
	})

	test('GET /health returns status', async () => {
		if (!proxyAvailable) return

		const res = await fetch(`${PROXY_URL}/health`)
		expect(res.ok).toBe(true)

		const data = await res.json()
		expect(data.status).toBe('ok')
		expect(data.routerUrl).toBeDefined()
		expect(data.availableModels).toBeInstanceOf(Array)
		expect(data.activeSessions).toBeInstanceOf(Array)

		console.log(`\n✅ Health check passed`)
		console.log(`   Router URL: ${data.routerUrl}`)
		console.log(`   Models: ${data.availableModels.length}`)
		console.log(`   Active sessions: ${data.activeSessions.length}`)
	})

	test('GET /v1/models returns model list', async () => {
		if (!proxyAvailable) return

		const res = await fetch(`${PROXY_URL}/v1/models`)
		expect(res.ok).toBe(true)

		const data = await res.json()
		expect(data.object).toBe('list')
		expect(data.data).toBeInstanceOf(Array)
		expect(data.data.length).toBeGreaterThan(0)

		// Check model format
		const model = data.data[0]
		expect(model.id).toBeDefined()
		expect(model.object).toBe('model')

		console.log(`\n✅ Models endpoint passed`)
		console.log(`   Available: ${data.data.length} models`)
	})

	test('POST /v1/chat/completions with invalid model returns error', async () => {
		if (!proxyAvailable) return

		const res = await fetch(`${PROXY_URL}/v1/chat/completions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: 'nonexistent-model-12345',
				messages: [{ role: 'user', content: 'test' }],
			}),
		})

		expect(res.status).toBe(400)

		const data = await res.json()
		expect(data.error).toBeDefined()
		expect(data.error.type).toBe('invalid_request_error')
		expect(data.error.code).toBe('model_not_found')

		console.log(`\n✅ Invalid model error handled correctly`)
	})

	test('POST /v1/chat/completions with invalid JSON returns error', async () => {
		if (!proxyAvailable) return

		const res = await fetch(`${PROXY_URL}/v1/chat/completions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: 'not json',
		})

		expect(res.status).toBe(400)

		const data = await res.json()
		expect(data.error).toBeDefined()
		expect(data.error.type).toBe('invalid_request_error')

		console.log(`\n✅ Invalid JSON error handled correctly`)
	})
})

describe('Proxy Session Status', () => {
	test('health endpoint shows session info', async () => {
		let proxyAvailable = false
		try {
			const res = await fetch(`${PROXY_URL}/health`, { signal: AbortSignal.timeout(2000) })
			proxyAvailable = res.ok
		} catch {
			return
		}

		if (!proxyAvailable) return

		const res = await fetch(`${PROXY_URL}/health`)
		const data = await res.json()

		// Sessions should be an array
		expect(data.activeSessions).toBeInstanceOf(Array)

		// If there are sessions, check format
		if (data.activeSessions.length > 0) {
			const session = data.activeSessions[0]
			expect(session.model).toBeDefined()
			expect(session.sessionId).toBeDefined()
			expect(session.expiresAt).toBeDefined()
			expect(session.active).toBeDefined()

			console.log(`\n📊 Active sessions:`)
			for (const s of data.activeSessions) {
				const expires = new Date(s.expiresAt)
				const remaining = Math.floor((expires.getTime() - Date.now()) / 3600000)
				console.log(`   ${s.model}: ${remaining}h remaining`)
			}
		} else {
			console.log(`\n📊 No active sessions (models not staked yet)`)
		}
	})
})
