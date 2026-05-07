import type { ReactNode } from 'react'
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

export type ToolbarProps = {
  view: EditorView | null
  onAction?: (text: string) => void
}

const btn =
  'group/btn relative flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'

const menuBtn =
  'group/btn relative flex h-7 w-8 items-center justify-center gap-0.5 rounded-md text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'

const divider = 'mx-0.5 h-4 w-px bg-slate-200 dark:bg-slate-700'

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

export function Toolbar({ view, onAction }: ToolbarProps) {
  const disabled = !view
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
