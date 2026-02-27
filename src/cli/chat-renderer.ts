/**
 * Chat Renderer - Proper terminal output with word wrapping and formatting
 *
 * Handles:
 * - Word-aware line wrapping (no mid-word breaks)
 * - Code block preservation
 * - List formatting with hanging indent
 * - Streaming with buffered output
 * - Thinking/reasoning tag formatting
 */

import stringWidth from 'string-width'
import stripAnsi from 'strip-ansi'
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

// Layout constants
const getTerminalWidth = () => process.stdout.columns ?? 100
const INDENT = 2
const MIN_WIDTH = 40

interface RenderOptions {
	maxWidth?: number
	indent?: number
	showBorder?: boolean
}

/**
 * Block types for parsing markdown-like content
 */
type BlockType = 'paragraph' | 'code' | 'list' | 'heading' | 'blank'

interface Block {
	type: BlockType
	content: string
	lang?: string // for code blocks
}

/**
 * Parse text into blocks (paragraphs, code, lists)
 */
function parseBlocks(text: string): Block[] {
	const blocks: Block[] = []
	const lines = text.split('\n')
	let i = 0

	while (i < lines.length) {
		const line = lines[i]

		// Blank line
		if (line.trim() === '') {
			blocks.push({ type: 'blank', content: '' })
			i++
			continue
		}

		// Code block (fenced)
		if (line.trim().startsWith('```')) {
			const lang = line.trim().slice(3).trim()
			const codeLines: string[] = []
			i++
			while (i < lines.length && !lines[i].trim().startsWith('```')) {
				codeLines.push(lines[i])
				i++
			}
			blocks.push({ type: 'code', content: codeLines.join('\n'), lang })
			i++ // skip closing ```
			continue
		}

		// Heading (# style)
		if (/^#{1,6}\s/.test(line)) {
			blocks.push({ type: 'heading', content: line })
			i++
			continue
		}

		// List item
		if (/^\s*([-*]|\d+\.)\s/.test(line)) {
			// Collect consecutive list items
			const listLines: string[] = []
			while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) {
				listLines.push(lines[i])
				i++
			}
			blocks.push({ type: 'list', content: listLines.join('\n') })
			continue
		}

		// Paragraph - collect until blank line or special block
		const paraLines: string[] = []
		while (
			i < lines.length &&
			lines[i].trim() !== '' &&
			!lines[i].trim().startsWith('```') &&
			!/^#{1,6}\s/.test(lines[i]) &&
			!/^\s*([-*]|\d+\.)\s/.test(lines[i])
		) {
			paraLines.push(lines[i])
			i++
		}
		if (paraLines.length > 0) {
			// Join paragraph lines with space (reflow)
			const content = paraLines.join(' ').replace(/\s+/g, ' ').trim()
			blocks.push({ type: 'paragraph', content })
		}
	}

	return blocks
}

/**
 * Render a code block with nice formatting
 */
function renderCodeBlock(block: Block, width: number): string[] {
	const lines: string[] = []
	const lang = block.lang || 'code'

	// Header
	lines.push(`${c.dim}┌─ ${lang}${c.reset}`)

	// Code lines (preserve whitespace, truncate if too long)
	for (const codeLine of block.content.split('\n')) {
		const displayLine =
			codeLine.length > width - 4 ? codeLine.slice(0, width - 7) + '...' : codeLine
		lines.push(`${c.dim}│${c.reset} ${displayLine}`)
	}

	// Footer
	lines.push(`${c.dim}└${'─'.repeat(Math.min(20, width - 2))}${c.reset}`)

	return lines
}

/**
 * Render a list with hanging indent
 */
function renderList(block: Block, width: number): string[] {
	const lines: string[] = []

	for (const item of block.content.split('\n')) {
		const match = item.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)
		if (match) {
			const [, leadingSpace, bullet, text] = match
			const bulletStr = `${leadingSpace}${c.dim}${bullet}${c.reset} `
			const bulletWidth = stringWidth(stripAnsi(bulletStr))
			const hangingIndent = ' '.repeat(bulletWidth)

			// Wrap the text portion
			const wrapped = wrapAnsi(text, width - bulletWidth, { hard: true })
			const wrappedLines = wrapped.split('\n')

			lines.push(bulletStr + wrappedLines[0])
			for (let i = 1; i < wrappedLines.length; i++) {
				lines.push(hangingIndent + wrappedLines[i])
			}
		} else {
			lines.push(item)
		}
	}

	return lines
}

/**
 * Render a heading
 */
function renderHeading(block: Block): string[] {
	const match = block.content.match(/^(#{1,6})\s+(.*)$/)
	if (match) {
		const [, hashes, text] = match
		const level = hashes.length
		if (level <= 2) {
			return [`\n${c.bold}${c.cyan}${text}${c.reset}\n`]
		}
		return [`${c.bold}${text}${c.reset}`]
	}
	return [block.content]
}

/**
 * Render assistant message with proper formatting
 */
export function renderMessage(text: string, opts: RenderOptions = {}): string[] {
	const termWidth = getTerminalWidth()
	const maxWidth = Math.max(MIN_WIDTH, Math.min(opts.maxWidth ?? 96, termWidth - 6))
	const indent = opts.indent ?? INDENT
	const indentStr = ' '.repeat(indent)

	const blocks = parseBlocks(text)
	const outputLines: string[] = []
	let lastWasBlank = false

	for (const block of blocks) {
		let blockLines: string[] = []

		switch (block.type) {
			case 'blank':
				// Limit to single blank line between blocks
				if (!lastWasBlank) {
					blockLines = ['']
					lastWasBlank = true
				}
				continue

			case 'code':
				blockLines = renderCodeBlock(block, maxWidth)
				break

			case 'list':
				blockLines = renderList(block, maxWidth)
				break

			case 'heading':
				blockLines = renderHeading(block)
				break

			case 'paragraph':
				// Word-wrap paragraph
				const wrapped = wrapAnsi(block.content, maxWidth, { hard: true })
				blockLines = wrapped.split('\n')
				break
		}

		lastWasBlank = false

		// Add indent to each line
		for (const line of blockLines) {
			outputLines.push(indentStr + line)
		}
	}

	return outputLines
}

/**
 * Format thinking/reasoning content
 */
export function formatThinking(content: string): string {
	const termWidth = getTerminalWidth()
	const maxWidth = Math.max(MIN_WIDTH, Math.min(80, termWidth - 10))
	const wrapped = wrapAnsi(content, maxWidth, { hard: true })

	const lines = wrapped.split('\n')
	const formatted = lines.map((line) => `${c.dim}  │ ${line}${c.reset}`).join('\n')

	return `\n${c.dim}  ┌─ thinking${c.reset}\n${formatted}\n${c.dim}  └${'─'.repeat(12)}${c.reset}\n`
}

/**
 * Streaming chat printer with buffered output
 */
export class ChatPrinter {
	private buffer = ''
	private reasoningBuffer = ''
	private lastFlushTime = 0
	private flushInterval = 150 // ms
	private model = ''
	private isFirstContent = true
	private isFirstReasoning = true
	private hasStarted = false
	private showReasoning = false

	constructor(model: string, showReasoning = false) {
		this.model = model
		this.showReasoning = showReasoning
	}

	/**
	 * Add content to buffer
	 */
	addContent(content: string): void {
		if (!this.hasStarted) {
			this.hasStarted = true
			// Print model header
			process.stdout.write(`\n${c.blue}${this.model}${c.reset}:\n`)
		}

		if (this.isFirstContent && !this.isFirstReasoning && this.showReasoning) {
			// Transition from reasoning to content - flush reasoning first
			this.flushReasoning()
			process.stdout.write('\n')
		}

		this.isFirstContent = false
		this.buffer += content

		// Check for safe flush boundaries
		const shouldFlush =
			this.buffer.includes('\n\n') || // paragraph break
			this.buffer.endsWith('\n') || // line break
			this.buffer.endsWith('```') || // code fence
			Date.now() - this.lastFlushTime > this.flushInterval

		if (shouldFlush) {
			this.flush()
		}
	}

	/**
	 * Add reasoning content
	 */
	addReasoning(content: string): void {
		if (!this.showReasoning) return

		if (this.isFirstReasoning) {
			this.isFirstReasoning = false
			process.stdout.write(`\n${c.dim}  ┌─ thinking${c.reset}\n`)
		}

		this.reasoningBuffer += content

		// Flush reasoning on newlines
		if (this.reasoningBuffer.includes('\n')) {
			this.flushReasoning()
		}
	}

	/**
	 * Flush reasoning buffer
	 */
	private flushReasoning(): void {
		if (this.reasoningBuffer.length === 0) return

		const lines = this.reasoningBuffer.split('\n')
		// Keep last incomplete line in buffer
		this.reasoningBuffer = lines.pop() || ''

		for (const line of lines) {
			const trimmed = line.slice(0, (process.stdout.columns ?? 100) - 10)
			process.stdout.write(`${c.dim}  │ ${trimmed}${c.reset}\n`)
		}
	}

	/**
	 * Flush content buffer with proper word wrapping
	 */
	private flush(): void {
		if (this.buffer.length === 0) return

		const termWidth = getTerminalWidth()
		const maxWidth = Math.max(MIN_WIDTH, Math.min(96, termWidth - 6))

		// Find safe break point (don't break mid-word)
		let breakPoint = this.buffer.length
		const lastNewline = this.buffer.lastIndexOf('\n')

		if (lastNewline > 0) {
			breakPoint = lastNewline + 1
		}

		const toFlush = this.buffer.slice(0, breakPoint)
		this.buffer = this.buffer.slice(breakPoint)

		// Render and output
		const lines = renderMessage(toFlush, { maxWidth })
		for (const line of lines) {
			process.stdout.write(line + '\n')
		}

		this.lastFlushTime = Date.now()
	}

	/**
	 * Finalize output (flush remaining buffer)
	 */
	finish(): string {
		// Flush any remaining reasoning
		if (!this.isFirstReasoning) {
			this.flushReasoning()
			if (this.reasoningBuffer.length > 0) {
				process.stdout.write(`${c.dim}  │ ${this.reasoningBuffer}${c.reset}\n`)
			}
			process.stdout.write(`${c.dim}  └${'─'.repeat(12)}${c.reset}\n\n`)
		}

		// Flush remaining content
		if (this.buffer.length > 0) {
			const lines = renderMessage(this.buffer)
			for (const line of lines) {
				process.stdout.write(line + '\n')
			}
		}

		return this.buffer
	}

	/**
	 * Get full content (for saving to history)
	 */
	getContent(): string {
		return this.buffer
	}
}

export { c }
