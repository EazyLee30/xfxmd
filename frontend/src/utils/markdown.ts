import MarkdownIt, { type Options } from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import go from 'highlight.js/lib/languages/go'
import python from 'highlight.js/lib/languages/python'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import { getRichStyleCss, type RichStyleKind } from './richText'
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('go', go)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)

const highlightFn: NonNullable<Options['highlight']> = (str, lang) => {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
    } catch {
      /* fallthrough */
    }
  }
  return `<pre class="hljs"><code>${escapeHtml(str)}</code></pre>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function findUnescapedClosingBrace(src: string, from: number, to: number): number {
  let nestedStyleDepth = 0
  for (let i = from; i < to; i += 1) {
    if (src.charCodeAt(i) === 0x7b /* { */) {
      const nestedMatch = /^{(color|mark):([a-z0-9-]+)\|/.exec(src.slice(i))
      if (nestedMatch && getRichStyleCss(nestedMatch[1] as RichStyleKind, nestedMatch[2])) {
        nestedStyleDepth += 1
        i += nestedMatch[0].length - 1
      }
      continue
    }
    if (src.charCodeAt(i) !== 0x7d /* } */) continue
    let slashCount = 0
    for (let j = i - 1; j >= from && src.charCodeAt(j) === 0x5c /* \ */; j -= 1) {
      slashCount += 1
    }
    if (slashCount % 2 !== 0) continue
    if (nestedStyleDepth > 0) {
      nestedStyleDepth -= 1
      continue
    }
    return i
  }
  return -1
}

function richStyleRule(state: StateInline, silent: boolean): boolean {
  if (state.src.charCodeAt(state.pos) !== 0x7b /* { */) return false

  const match = /^{(color|mark):([a-z0-9-]+)\|/.exec(state.src.slice(state.pos))
  if (!match) return false

  const kind = match[1] as RichStyleKind
  const colorKey = match[2]
  const style = getRichStyleCss(kind, colorKey)
  if (!style) return false

  const contentStart = state.pos + match[0].length
  const contentEnd = findUnescapedClosingBrace(state.src, contentStart, state.posMax)
  if (contentEnd < 0) return false

  if (silent) return true

  const tag = kind === 'mark' ? 'mark' : 'span'
  const openToken = state.push(`${kind}_open`, tag, 1)
  openToken.attrSet('style', style)
  openToken.attrJoin('class', kind === 'mark' ? 'md-mark' : 'md-color')

  state.md.inline.parse(state.src.slice(contentStart, contentEnd), state.md, state.env, state.tokens)
  state.push(`${kind}_close`, tag, -1)
  state.pos = contentEnd + 1
  return true
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: highlightFn,
})
md.inline.ruler.before('emphasis', 'rich_style', richStyleRule)

/** Render markdown source to HTML (unsanitized). */
export function renderMarkdown(src: string): string {
  return md.render(src)
}
