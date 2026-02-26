#!/usr/bin/env bun
/**
 * Model Status Test
 *
 * Tests all available models and outputs JSON with full metadata.
 * Results saved to docs/model-status/YYYY-MM-DD-HHmmss.json
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { MorDiemSDK } from '../src/index.ts'

const TEST_PROMPT = 'Say "hello" and nothing else.'
const TEST_MAX_TOKENS = 100
const TEST_TIMEOUT_MS = 60000

interface ModelResult {
	model: string
	status: 'working' | 'provider_error' | 'no_provider' | 'timeout'
	responseTimeMs?: number
	responseLength?: number
	error?: string
	stakeRequired: number
	sessionDays: number
}

interface TestReport {
	timestamp: string
	wallet: string // truncated: 0xf5a8...05c1
	sufficientBalance: boolean
	testConfig: {
		prompt: string
		maxTokens: number
		timeoutMs: number
	}
	summary: {
		total: number
		working: number
		providerError: number
		noProvider: number
		timeout: number
	}
	results: ModelResult[]
}

async function main() {
	const mnemonic = process.env.MOR_MNEMONIC
	if (!mnemonic) {
		console.error('MOR_MNEMONIC not set')
		process.exit(1)
	}

	const sdk = new MorDiemSDK({ mnemonic })
	const balances = await sdk.getBalances()
	const models = await sdk.listModels()

	const timestamp = new Date().toISOString()
	const results: ModelResult[] = []

	console.log(`Testing ${models.data.length} models...`)
	console.log('')

	for (const m of models.data) {
		const modelId = m.id
		process.stdout.write(`  ${modelId}... `)

		const result: ModelResult = {
			model: modelId,
			status: 'working',
			stakeRequired: 0.1, // MOR
			sessionDays: 7,
		}

		try {
			const start = Date.now()
			const response = await sdk.complete(TEST_PROMPT, {
				model: modelId,
				maxTokens: TEST_MAX_TOKENS,
			})
			const elapsed = Date.now() - start

			if (response && response.length > 0) {
				result.status = 'working'
				result.responseTimeMs = elapsed
				result.responseLength = response.length
				console.log(`✅ ${elapsed}ms`)
			} else {
				result.status = 'working'
				result.responseTimeMs = elapsed
				result.responseLength = 0
				console.log(`✅ ${elapsed}ms (empty)`)
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			const lowerMsg = msg.toLowerCase()

			if (lowerMsg.includes('no active bids') || lowerMsg.includes('no bids')) {
				result.status = 'no_provider'
				result.error = 'No provider serving this model'
				console.log('⬜ No provider')
			} else if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out')) {
				result.status = 'timeout'
				result.error = 'Request timed out'
				console.log('⏱️ Timeout')
			} else {
				result.status = 'provider_error'
				// Extract meaningful error
				if (lowerMsg.includes('overloaded')) {
					result.error = 'Provider overloaded (503)'
				} else if (lowerMsg.includes('serviceunavailable')) {
					result.error = 'Provider unavailable'
				} else {
					result.error = msg.slice(0, 100)
				}
				console.log(`❌ ${result.error.slice(0, 40)}`)
			}
		}

		results.push(result)
	}

	// Build report
	const truncatedWallet = `${sdk.address.slice(0, 6)}...${sdk.address.slice(-4)}`
	const hasSufficientBalance = balances.mor >= BigInt(1e18) && balances.eth >= BigInt(1e15) // 1 MOR, 0.001 ETH

	const report: TestReport = {
		timestamp,
		wallet: truncatedWallet,
		sufficientBalance: hasSufficientBalance,
		testConfig: {
			prompt: TEST_PROMPT,
			maxTokens: TEST_MAX_TOKENS,
			timeoutMs: TEST_TIMEOUT_MS,
		},
		summary: {
			total: results.length,
			working: results.filter((r) => r.status === 'working').length,
			providerError: results.filter((r) => r.status === 'provider_error').length,
			noProvider: results.filter((r) => r.status === 'no_provider').length,
			timeout: results.filter((r) => r.status === 'timeout').length,
		},
		results: results.sort((a, b) => {
			// Sort: working first (by speed), then errors, then no provider
			if (a.status === 'working' && b.status !== 'working') return -1
			if (a.status !== 'working' && b.status === 'working') return 1
			if (a.status === 'working' && b.status === 'working') {
				return (a.responseTimeMs || 0) - (b.responseTimeMs || 0)
			}
			return 0
		}),
	}

	// Save JSON
	const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
	const filename = `${dateStr}.json`
	const outDir = join(import.meta.dir, '..', 'docs', 'model-status')
	mkdirSync(outDir, { recursive: true })

	const jsonPath = join(outDir, filename)
	writeFileSync(jsonPath, JSON.stringify(report, null, 2))

	// Update index.json (list of all test files, newest first)
	const indexPath = join(outDir, 'index.json')
	let index: string[] = []
	try {
		index = JSON.parse(await Bun.file(indexPath).text())
	} catch {
		/* first run */
	}

	// Add new file to front, keep last 50
	index = [filename, ...index.filter((f) => f !== filename)].slice(0, 50)
	writeFileSync(indexPath, JSON.stringify(index, null, 2))

	// Print summary
	console.log('')
	console.log('=== SUMMARY ===')
	console.log(`✅ Working: ${report.summary.working}`)
	console.log(`❌ Provider errors: ${report.summary.providerError}`)
	console.log(`⬜ No provider: ${report.summary.noProvider}`)
	console.log(`⏱️ Timeout: ${report.summary.timeout}`)
	console.log('')
	console.log(`Saved: ${filename}`)
}

main().catch(console.error)
