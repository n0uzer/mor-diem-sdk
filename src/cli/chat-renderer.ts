/**
 * Chat Renderer - Proper terminal output with word wrapping
 *
 * Simple approach:
 * - Stream raw tokens during generation (fast feedback)
 * - Word-wrap only complete lines (no mid-word breaks)
 * - Format thinking in a box
 */

import wrapAnsi from 'wrap-ansi'

// ANSI color codes
const c = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	dim: '\x1b[2m',
	italic: '\x1b[3m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
	gray: '\x1b[90m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	magenta: '\x1b[35m',
}

// Layout
const getWidth = () => Math.min(100, (process.stdout.columns ?? 100) - 4)

/**
 * Wrap text at word boundaries (never mid-word)
 */
function wordWrap(text: string, width: number): string {
	// wrap-ansi with hard:false wraps at word boundaries
	return wrapAnsi(text, width, { hard: false, trim: false })
}

/**
 * Streaming chat printer
 *
 * Strategy: Buffer partial words, flush complete words immediately.
 * This gives fast feedback while avoiding mid-word line breaks.
 */
export class ChatPrinter {
	private buffer = '' // holds partial word
	private reasoningBuffer = ''
	private model: string
	private showReasoning: boolean
	private hasStartedContent = false
	private hasStartedReasoning = false
	private inReasoningMode = false
	private fullContent = ''
	private width: number

	constructor(model: string, showReasoning = false) {
		this.model = model
		this.showReasoning = showReasoning
		this.width = getWidth()
	}

	/**
	 * Add reasoning/thinking content
	 */
	addReasoning(content: string): void {
		if (!this.showReasoning) return

		// Start reasoning box if first chunk
		if (!this.hasStartedReasoning) {
			this.hasStartedReasoning = true
			this.inReasoningMode = true
			process.stdout.write(`\n${c.dim}  ┌─ thinking${c.reset}\n`)
		}

		this.reasoningBuffer += content

		// Flush complete lines
		const lines = this.reasoningBuffer.split('\n')
		this.reasoningBuffer = lines.pop() || '' // keep incomplete line

		for (const line of lines) {
			const wrapped = wordWrap(line, this.width - 6)
			for (const wline of wrapped.split('\n')) {
				process.stdout.write(`${c.dim}  │ ${wline}${c.reset}\n`)
			}
		}
	}

	/**
	 * Close reasoning box if open
	 */
	private closeReasoning(): void {
		if (!this.inReasoningMode) return
		this.inReasoningMode = false

		// Flush remaining reasoning
		if (this.reasoningBuffer.length > 0) {
			const wrapped = wordWrap(this.reasoningBuffer, this.width - 6)
			for (const line of wrapped.split('\n')) {
				process.stdout.write(`${c.dim}  │ ${line}${c.reset}\n`)
			}
			this.reasoningBuffer = ''
		}
		process.stdout.write(`${c.dim}  └${'─'.repeat(12)}${c.reset}\n\n`)
	}

	/**
	 * Add main content
	 */
	addContent(content: string): void {
		// Close reasoning box when content starts
		if (this.inReasoningMode) {
			this.closeReasoning()
		}

		// Print model header on first content
		if (!this.hasStartedContent) {
			this.hasStartedContent = true
			process.stdout.write(`\n${c.blue}${this.model}${c.reset}:\n\n`)
		}

		this.fullContent += content
		this.buffer += content

		// Flush complete lines and complete words
		// A word is complete if followed by space, newline, or punctuation
		const flushPoint = this.findFlushPoint()
		if (flushPoint > 0) {
			const toFlush = this.buffer.slice(0, flushPoint)
			this.buffer = this.buffer.slice(flushPoint)

			// Output with word wrapping
			const wrapped = wordWrap(toFlush, this.width)
			process.stdout.write(wrapped)
		}
	}

	/**
	 * Find safe point to flush (after complete words)
	 */
	private findFlushPoint(): number {
		// Look for last space or newline
		let lastSafe = -1
		for (let i = this.buffer.length - 1; i >= 0; i--) {
			const ch = this.buffer[i]
			if (ch === ' ' || ch === '\n' || ch === '\t') {
				lastSafe = i + 1
				break
			}
		}
		return lastSafe
	}

	/**
	 * Finalize - flush remaining buffer
	 */
	finish(): string {
		// Close reasoning if still open
		if (this.inReasoningMode) {
			this.closeReasoning()
		}

		// Print header if we never got content
		if (!this.hasStartedContent && !this.hasStartedReasoning) {
			process.stdout.write(`\n${c.blue}${this.model}${c.reset}:\n\n`)
		}

		// Flush remaining buffer
		if (this.buffer.length > 0) {
			const wrapped = wordWrap(this.buffer, this.width)
			process.stdout.write(wrapped)
			this.buffer = ''
		}

		process.stdout.write('\n')
		return this.fullContent
	}

	getContent(): string {
		return this.fullContent
	}
}

export { c }
