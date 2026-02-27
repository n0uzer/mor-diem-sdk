#!/usr/bin/env bun
/**
 * Start Script
 *
 * Starts both the Morpheus Node and the SDK proxy.
 * Waits for each to be healthy before continuing.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const MORPHEUS_DIR = join(process.cwd(), 'bin', 'morpheus')
const BINARY_PATH = join(MORPHEUS_DIR, 'proxy-router')
const COOKIE_PATH = join(MORPHEUS_DIR, '.cookie')

async function waitForHealth(url: string, name: string, maxWait = 30000): Promise<boolean> {
	const start = Date.now()
	while (Date.now() - start < maxWait) {
		try {
			const res = await fetch(url)
			if (res.ok) {
				return true
			}
		} catch {
			// Not ready yet
		}
		await new Promise((r) => setTimeout(r, 500))
	}
	return false
}

async function main() {
	console.log('🚀 Starting Morpheus services...\n')

	// Check if setup was run
	if (!existsSync(BINARY_PATH)) {
		console.error('❌ Morpheus Node not found. Run: bun run setup')
		process.exit(1)
	}

	const envPath = join(MORPHEUS_DIR, '.env')
	if (!existsSync(envPath)) {
		console.error('❌ Config not found. Run: bun run setup')
		process.exit(1)
	}

	// Start Morpheus Node
	console.log('📡 Starting Morpheus Node (HTTP: 8082, TCP: 9081)...')
	const nodeProc = spawn('./proxy-router', [], {
		cwd: MORPHEUS_DIR,
		detached: true,
		stdio: 'ignore',
	})
	nodeProc.unref()

	// Wait for node to create cookie
	const cookieStart = Date.now()
	while (!existsSync(COOKIE_PATH) && Date.now() - cookieStart < 10000) {
		await new Promise((r) => setTimeout(r, 200))
	}

	if (!existsSync(COOKIE_PATH)) {
		console.error('❌ Morpheus Node failed to start (no cookie created)')
		console.error('   Check bin/morpheus/.env has WALLET_PRIVATE_KEY set')
		process.exit(1)
	}
	console.log('   ✅ Cookie created')

	// Start proxy
	console.log('🔌 Starting SDK proxy (port 8083)...')
	const proxyProc = spawn('bun', ['run', 'src/proxy/openai-session-proxy.ts'], {
		cwd: process.cwd(),
		detached: true,
		stdio: 'ignore',
		env: { ...process.env },
	})
	proxyProc.unref()

	// Wait for proxy health
	const proxyHealthy = await waitForHealth('http://localhost:8083/health', 'Proxy', 15000)
	if (!proxyHealthy) {
		console.error('❌ Proxy failed to start')
		process.exit(1)
	}

	// Get model count
	try {
		const healthRes = await fetch('http://localhost:8083/health')
		const health = await healthRes.json()
		console.log(`   ✅ Proxy ready (${health.availableModels?.length || 0} models)\n`)
	} catch {
		console.log('   ✅ Proxy ready\n')
	}

	console.log('✅ All services running!\n')
	console.log('Next:')
	console.log('   bun run cli     # Interactive chat')
	console.log('   bun run stop    # Stop everything\n')
}

main().catch((err) => {
	console.error('❌ Start failed:', err.message)
	process.exit(1)
})
