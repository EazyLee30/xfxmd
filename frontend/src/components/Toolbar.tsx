import { useState, type ReactNode } from 'react'
import type { EditorView } from '@codemirror/view'
import {
  Bold,
  Italic,
  Code,
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Table,
  Pilcrow,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
  Link,
  ImageIcon,
  CodeSquare,
  Highlighter,
  Minus,
  Type,
} from 'lucide-react'
import { HIGHLIGHT_COLOR_OPTIONS, TEXT_COLOR_OPTIONS, type RichStyleKind, type RichStyleOption } from '../utils/richText'

function wrap(view: EditorView, open: string, close: string = open) {
  const { from, to } = view.state.selection.main
  const text = view.state.sliceDoc(from, to)
  view.dispatch({
    changes: { from, to, insert: open + text + close },
    selection: { anchor: from + open.length, head: from + open.length + text.length },
  })
  view.focus()
}

function insertPrefixLine(view: EditorView, prefix: string) {
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  view.dispatch({
    changes: { from: line.from, insert: prefix },
    selection: { anchor: pos + prefix.length },
  })
  view.focus()
}

function insertBlock(view: EditorView, text: string) {
  const pos = view.state.selection.main.head
  view.dispatch({
    changes: { from: pos, insert: text },
    selection: { anchor: pos + text.length },
  })
  view.focus()
}

function wrapRichStyle(view: EditorView, kind: RichStyleKind, colorKey: string) {
  wrap(view, `{${kind}:${colorKey}|`, '}')
}

type TextAlignment = 'left' | 'center' | 'right'

const toolbarAlignOpenRe = /^:::\s*align-(left|center|right)\s*$/
const toolbarAlignCloseRe = /^:::\s*$/

function stripParagraphMarkers(text: string) {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s{0,3}(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/, ''))
    .join('\n')
}

function findContainingAlignmentBlock(view: EditorView, lineNumber: number) {
  let openLineNumber = -1
  for (let current = lineNumber; current >= 1; current -= 1) {
    const text = view.state.doc.line(current).text.trim()
    if (toolbarAlignOpenRe.test(text)) {
      openLineNumber = current
      break
    }
    if (current !== lineNumber && toolbarAlignCloseRe.test(text)) return null
  }
  if (openLineNumber < 0) return null

  for (let current = openLineNumber + 1; current <= view.state.doc.lines; current += 1) {
    const line = view.state.doc.line(current)
    if (toolbarAlignCloseRe.test(line.text.trim())) {
      return { openLine: view.state.doc.line(openLineNumber), closeLine: line }
    }
  }

  return null
}

function replaceExistingAlignment(view: EditorView, align: TextAlignment) {
  const { from, to } = view.state.selection.main
  const startBlock = findContainingAlignmentBlock(view, view.state.doc.lineAt(from).number)
  const endBlock = findContainingAlignmentBlock(view, view.state.doc.lineAt(to).number)
  if (!startBlock || !endBlock || startBlock.openLine.number !== endBlock.openLine.number) return false

  view.dispatch({
    changes: { from: startBlock.openLine.from, to: startBlock.openLine.to, insert: `::: align-${align}` },
    selection: { anchor: to },
  })
  view.focus()
  return true
}

function unwrapExistingAlignmentAsParagraph(view: EditorView) {
  const { from, to } = view.state.selection.main
  const startBlock = findContainingAlignmentBlock(view, view.state.doc.lineAt(from).number)
  const endBlock = findContainingAlignmentBlock(view, view.state.doc.lineAt(to).number)
  if (!startBlock || !endBlock || startBlock.openLine.number !== endBlock.openLine.number) return false

  const innerFrom = Math.min(startBlock.openLine.to + 1, view.state.doc.length)
  const innerTo = Math.max(innerFrom, startBlock.closeLine.from - 1)
  const inner = stripParagraphMarkers(view.state.sliceDoc(innerFrom, innerTo))

  view.dispatch({
    changes: { from: startBlock.openLine.from, to: startBlock.closeLine.to, insert: inner },
    selection: { anchor: startBlock.openLine.from + inner.length },
  })
  view.focus()
  return true
}

function replaceSelectedLines(view: EditorView, update: (text: string) => string) {
  const { from, to } = view.state.selection.main
  const startLine = view.state.doc.lineAt(from)
  const endLine = view.state.doc.lineAt(to)
  const text = view.state.sliceDoc(startLine.from, endLine.to)
  const nextText = update(text)

  view.dispatch({
    changes: { from: startLine.from, to: endLine.to, insert: nextText },
    selection: { anchor: startLine.from + nextText.length },
  })
  view.focus()
}

function applyParagraph(view: EditorView) {
  if (unwrapExistingAlignmentAsParagraph(view)) return
  replaceSelectedLines(view, stripParagraphMarkers)
}

function applyAlignment(view: EditorView, align: TextAlignment) {
  if (replaceExistingAlignment(view, align)) return

  const { from, to } = view.state.selection.main
  const startLine = view.state.doc.lineAt(from)
  const endLine = view.state.doc.lineAt(to)
  const text = view.state.sliceDoc(startLine.from, endLine.to) || '文本'
  const open = `::: align-${align}\n`
  const insert = `${open}${text}\n:::`
  const selection = text === '文本' ? { anchor: startLine.from + open.length, head: startLine.from + open.length + text.length } : { anchor: startLine.from + insert.length }

  view.dispatch({
    changes: { from: startLine.from, to: endLine.to, insert },
    selection,
  })
  view.focus()
}

export type ToolbarProps = {
  view: EditorView | null
  disabled?: boolean
  onAction?: (text: string) => void
}

const btn =
  'group/btn relative flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'

const menuBtn =
  'group/btn relative flex h-7 w-8 items-center justify-center gap-0.5 rounded-md text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'

const divider = 'mx-0.5 h-4 w-px bg-slate-200 dark:bg-slate-700'

const MAX_TABLE_ROWS = 8
const MAX_TABLE_COLS = 8

function buildMarkdownTable(rows: number, cols: number): string {
  const headerCells = Array.from({ length: cols }, (_, index) => `列 ${index + 1}`)
  const dividerCells = Array.from({ length: cols }, () => '---')
  const bodyRows = Array.from({ length: Math.max(0, rows - 1) }, () => `| ${Array.from({ length: cols }, () => '').join(' | ')} |`)

  return ['', `| ${headerCells.join(' | ')} |`, `| ${dividerCells.join(' | ')} |`, ...bodyRows, ''].join('\n')
}

type ColorMenuProps = {
  disabled: boolean
  icon: ReactNode
  options: RichStyleOption[]
  tooltip: string
  onPick: (key: string) => void
}

function ColorMenu({ disabled, icon, options, tooltip, onPick }: ColorMenuProps) {
  return (
    <div className="group/menu relative flex">
      <button type="button" disabled={disabled} data-tooltip={tooltip} className={menuBtn}>
        {icon}
        <ChevronDown size={10} strokeWidth={2.2} />
      </button>
      <div className="absolute left-0 top-full z-40 mt-1 hidden w-[116px] grid-cols-4 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-xl group-focus-within/menu:grid group-hover/menu:grid dark:border-slate-700 dark:bg-slate-900">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            disabled={disabled}
            title={option.label}
            aria-label={`${tooltip}：${option.label}`}
            className="h-5 w-5 rounded border border-slate-200 shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-teal-400/40 disabled:opacity-40 dark:border-slate-700"
            style={{ backgroundColor: option.value }}
            onClick={() => onPick(option.key)}
          />
        ))}
      </div>
    </div>
  )
}

type TableMenuProps = {
  disabled: boolean
  onPick: (rows: number, cols: number) => void
}

function TableMenu({ disabled, onPick }: TableMenuProps) {
  const [size, setSize] = useState({ rows: 3, cols: 3 })
  const rows = Array.from({ length: MAX_TABLE_ROWS }, (_, index) => index + 1)
  const cols = Array.from({ length: MAX_TABLE_COLS }, (_, index) => index + 1)

  return (
    <div className="group/menu relative flex">
      <button type="button" disabled={disabled} data-tooltip="插入表格" aria-label="插入表格" className={menuBtn}>
        <Table size={15} strokeWidth={2.2} />
        <ChevronDown size={10} strokeWidth={2.2} />
      </button>
      <div className="absolute left-0 top-full z-40 mt-1 hidden w-[188px] rounded-lg border border-slate-200 bg-white p-2 shadow-xl group-focus-within/menu:block group-hover/menu:block dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-2 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {size.rows} 行 × {size.cols} 列
        </div>
        <div className="grid grid-cols-8 gap-1">
          {rows.flatMap((row) =>
            cols.map((col) => {
              const selected = row <= size.rows && col <= size.cols
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  disabled={disabled}
                  title={`插入 ${row} 行 ${col} 列表格`}
                  aria-label={`插入 ${row} 行 ${col} 列表格`}
                  className={[
                    'h-4 w-4 rounded-[3px] border transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400/40 disabled:opacity-40',
                    selected
                      ? 'border-teal-400 bg-teal-100 dark:border-teal-400/80 dark:bg-teal-400/25'
                      : 'border-slate-200 bg-white hover:border-teal-300 dark:border-slate-700 dark:bg-slate-950',
                  ].join(' ')}
                  onMouseEnter={() => setSize({ rows: row, cols: col })}
                  onFocus={() => setSize({ rows: row, cols: col })}
                  onClick={() => onPick(row, col)}
                />
              )
            }),
          )}
        </div>
      </div>
    </div>
  )
}

export function Toolbar({ view, disabled: disabledProp = false, onAction }: ToolbarProps) {
  const disabled = disabledProp || !view
  const done = () => {
    if (!view || !onAction) return
    onAction(view.state.doc.toString())
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5 border-b border-slate-200/80 bg-white/60 px-2.5 py-1.5 dark:border-slate-800/80 dark:bg-slate-950/40">
      <button type="button" disabled={disabled} data-tooltip="粗体 ⌘B" className={btn} onClick={() => view && (wrap(view, '**'), done())}>
        <Bold size={15} strokeWidth={2.2} />
      </button>
      <button type="button" disabled={disabled} data-tooltip="斜体 ⌘I" className={btn} onClick={() => view && (wrap(view, '*'), done())}>
        <Italic size={15} strokeWidth={2.2} />
      </button>
      <button type="button" disabled={disabled} data-tooltip="行内代码" className={btn} onClick={() => view && (wrap(view, '`'), done())}>
        <Code size={15} strokeWidth={2.2} />
      </button>
      <ColorMenu
        disabled={disabled}
        tooltip="字体颜色"
        icon={<Type size={15} strokeWidth={2.2} />}
        options={TEXT_COLOR_OPTIONS}
        onPick={(key) => view && (wrapRichStyle(view, 'color', key), done())}
      />
      <ColorMenu
        disabled={disabled}
        tooltip="高光"
        icon={<Highlighter size={15} strokeWidth={2.2} />}
        options={HIGHLIGHT_COLOR_OPTIONS}
        onPick={(key) => view && (wrapRichStyle(view, 'mark', key), done())}
      />

      <div className={divider} />

      <button type="button" disabled={disabled} data-tooltip="一级标题" className={btn} onClick={() => view && (insertPrefixLine(view, '# '), done())}>
        <Heading1 size={15} strokeWidth={2.2} />
      </button>
      <button type="button" disabled={disabled} data-tooltip="二级标题" className={btn} onClick={() => view && (insertPrefixLine(view, '## '), done())}>
        <Heading2 size={15} strokeWidth={2.2} />
      </button>
      <button type="button" disabled={disabled} data-tooltip="三级标题" className={btn} onClick={() => view && (insertPrefixLine(view, '### '), done())}>
        <Heading3 size={15} strokeWidth={2.2} />
      </button>
      <button type="button" disabled={disabled} data-tooltip="正文/段落" className={btn} onClick={() => view && (applyParagraph(view), done())}>
        <Pilcrow size={15} strokeWidth={2.2} />
      </button>

      <div className={divider} />

      <button type="button" disabled={disabled} data-tooltip="左对齐" className={btn} onClick={() => view && (applyAlignment(view, 'left'), done())}>
        <TextAlignStart size={15} strokeWidth={2.2} />
      </button>
      <button type="button" disabled={disabled} data-tooltip="居中对齐" className={btn} onClick={() => view && (applyAlignment(view, 'center'), done())}>
        <TextAlignCenter size={15} strokeWidth={2.2} />
      </button>
      <button type="button" disabled={disabled} data-tooltip="右对齐" className={btn} onClick={() => view && (applyAlignment(view, 'right'), done())}>
        <TextAlignEnd size={15} strokeWidth={2.2} />
      </button>

      <div className={divider} />

      <button type="button" disabled={disabled} data-tooltip="无序列表" className={btn} onClick={() => view && (insertPrefixLine(view, '- '), done())}>
        <List size={15} strokeWidth={2.2} />
      </button>
      <button type="button" disabled={disabled} data-tooltip="有序列表" className={btn} onClick={() => view && (insertPrefixLine(view, '1. '), done())}>
        <ListOrdered size={15} strokeWidth={2.2} />
      </button>
      <button type="button" disabled={disabled} data-tooltip="引用" className={btn} onClick={() => view && (insertPrefixLine(view, '> '), done())}>
        <Quote size={15} strokeWidth={2.2} />
      </button>
      <TableMenu disabled={disabled} onPick={(rows, cols) => view && (insertBlock(view, buildMarkdownTable(rows, cols)), done())} />

      <div className={divider} />

      <button
        type="button"
        disabled={disabled}
        data-tooltip="插入链接"
        className={btn}
        onClick={() => {
          if (!view) return
          const label = window.prompt('链接文字（可选）', '')
          const url = window.prompt('URL', 'https://')
          if (!url) return
          const { from, to } = view.state.selection.main
          const inner = label?.trim() || view.state.sliceDoc(from, to) || url
          const md = `[${inner}](${url})`
          view.dispatch({
            changes: { from, to, insert: md },
            selection: { anchor: from + md.length },
          })
          view.focus()
          done()
        }}
      >
        <Link size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        disabled={disabled}
        data-tooltip="插入图片"
        className={btn}
        onClick={() => {
          if (!view) return
          const url = window.prompt('图片 URL', 'https://')
          if (!url) return
          const alt = window.prompt('替代文字', 'image') || 'image'
          insertBlock(view, `![${alt}](${url})`)
          done()
        }}
      >
        <ImageIcon size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        disabled={disabled}
        data-tooltip="代码块"
        className={btn}
        onClick={() => {
          if (!view) return
          insertBlock(view, '\n```\n\n```\n')
          done()
        }}
      >
        <CodeSquare size={15} strokeWidth={2.2} />
      </button>
      <button type="button" disabled={disabled} data-tooltip="分隔线" className={btn} onClick={() => view && (insertBlock(view, '\n---\n'), done())}>
        <Minus size={15} strokeWidth={2.2} />
      </button>
    </div>
  )
}
