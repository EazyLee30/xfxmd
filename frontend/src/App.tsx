import { useCallback, useEffect, useRef, useState } from 'react'
import type { EditorView } from '@codemirror/view'
import {
  FileEdit,
  Hash,
  Sun,
  Moon,
  LogOut,
  Eye,
  FileText,
  FileCode,
  ChevronDown,
  Pencil,
} from 'lucide-react'
import { AdminPage } from './components/AdminPage'
import { CollabPanel, type OnlineUser, type TimelineItem } from './components/CollabPanel'
import { Editor } from './components/Editor'
import { Preview } from './components/Preview'
import { SyncBar } from './components/SyncBar'
import { Toolbar } from './components/Toolbar'
import { UserList } from './components/UserList'
import { UserPanel } from './components/UserPanel'
import { useScrollSync } from './hooks/useScrollSync'
import { useYjs } from './hooks/useYjs'
import { renderMarkdown } from './utils/markdown'
import { buildDiceBearAvatarUrl } from './utils/avatars'

function readDefaultRoom(): string {
  const q = new URLSearchParams(location.search).get('room')
  if (q && q.trim()) return q.trim()
  const h = location.hash.replace(/^#/, '').trim()
  if (h) return h
  return 'default'
}

function compactEditPreview(text: string): string {
  const compact = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' / ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!compact) return '空白'
  return compact.length > 40 ? `${compact.slice(0, 40)}…` : compact
}

function diffTextParts(prev: string, next: string) {
  let start = 0
  while (start < prev.length && start < next.length && prev[start] === next[start]) start += 1

  let prevEnd = prev.length
  let nextEnd = next.length
  while (prevEnd > start && nextEnd > start && prev[prevEnd - 1] === next[nextEnd - 1]) {
    prevEnd -= 1
    nextEnd -= 1
  }

  return {
    inserted: next.slice(start, nextEnd),
    deleted: prev.slice(start, prevEnd),
  }
}

function summarizeEdit(prev: string, next: string): string {
  if (prev === next) return '编辑文档'

  const { inserted, deleted } = diffTextParts(prev, next)
  if (inserted && !deleted) return `新增 ${inserted.length} 字符：${compactEditPreview(inserted)}`
  if (!inserted && deleted) return `删除 ${deleted.length} 字符：${compactEditPreview(deleted)}`
  if (inserted && deleted) return `修改 ${deleted.length}→${inserted.length} 字符：${compactEditPreview(inserted)}`

  const diff = next.length - prev.length
  if (diff > 0) return `新增 ${diff} 字符`
  if (diff < 0) return `删除 ${Math.abs(diff)} 字符`
  return '编辑文档'
}

export default function App() {
  // Admin route
  if (location.pathname === '/admin') {
    return <AdminPage />
  }

  const [joined, setJoined] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [room, setRoom] = useState(readDefaultRoom)
  const [color, setColor] = useState('#4363d8')
  const [avatarUrl, setAvatarUrl] = useState(() => buildDiceBearAvatarUrl('adventurer', 'visitor'))
  const [dark, setDark] = useState(() =>
    typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)').matches : false,
  )

  const [editorView, setEditorView] = useState<EditorView | null>(null)
  const [previewEl, setPreviewEl] = useState<HTMLDivElement | null>(null)
  const [mdText, setMdText] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const lastLoggedTextRef = useRef('')
  const beforeLocalEditRef = useRef<string | null>(null)
  const pendingTimelineBaseRef = useRef<string | null>(null)
  const pendingTimelineNextRef = useRef('')
  const postTimerRef = useRef<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [splitPct, setSplitPct] = useState(52)
  const dragRef = useRef<{ startX: number; startPct: number; width: number } | null>(null)

  const { collab, status, ready } = useYjs(joined, room, displayName, color, avatarUrl)
  const editorReady = ready
  const canEdit = editorReady
  const syncMessage = status === 'disconnected' ? '连接断开，正在重连…' : '正在同步文档…'

  const markLocalInput = useCallback((beforeText: string) => {
    if (pendingTimelineBaseRef.current === null && beforeLocalEditRef.current === null) {
      beforeLocalEditRef.current = beforeText
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.classList.toggle('light', !dark)
  }, [dark])

  useEffect(() => {
    if (!collab) {
      setMdText('')
      setTimeline([])
      setOnlineUsers([])
      return
    }
    const upd = () => {
      const nextText = collab.ytext.toString()
      setMdText(nextText)
    }
    upd()
    collab.ytext.observe(upd)
    return () => {
      collab.ytext.unobserve(upd)
    }
  }, [collab])

  useEffect(() => {
    if (pendingTimelineBaseRef.current === null) {
      lastLoggedTextRef.current = mdText
    }
  }, [mdText])

  useEffect(() => {
    if (!collab) return
    const aw = collab.provider.awareness
    const refresh = () => {
      const users: OnlineUser[] = []
      aw.getStates().forEach((state: { user?: { name?: string; color?: string; avatarUrl?: string } }, clientId: number) => {
        if (!state.user?.name) return
        users.push({
          clientId,
          name: state.user.name,
          color: state.user.color ?? '#64748b',
          avatarUrl: state.user.avatarUrl,
        })
      })
      users.sort((a, b) => a.name.localeCompare(b.name))
      setOnlineUsers(users)
    }
    refresh()
    aw.on('change', refresh)
    return () => {
      aw.off('change', refresh)
    }
  }, [collab])

  useEffect(() => {
    if (!joined) return
    let aborted = false
    const fetchTimeline = async () => {
      try {
        const res = await fetch(`/api/room/${encodeURIComponent(room)}/timeline?limit=60`)
        if (!res.ok) return
        const data = (await res.json()) as { items?: TimelineItem[] }
        if (!aborted) setTimeline(data.items ?? [])
      } catch {
        // ignore network jitter
      }
    }
    fetchTimeline()
    const timer = window.setInterval(fetchTimeline, 4000)
    return () => {
      aborted = true
      window.clearInterval(timer)
    }
  }, [joined, room])

  useEffect(() => {
    return () => {
      if (postTimerRef.current) window.clearTimeout(postTimerRef.current)
    }
  }, [])

  useScrollSync(editorView, previewEl, Boolean(joined && editorReady && previewEl))

  const onViewChange = useCallback((v: EditorView | null) => {
    setEditorView(v)
  }, [])

  const onJoin = (name: string, r: string, c: string, avatar: string) => {
    setDisplayName(name)
    setRoom(r)
    setColor(c)
    setAvatarUrl(avatar)
    setJoined(true)
    const url = new URL(location.href)
    url.searchParams.set('room', r)
    history.replaceState(null, '', url.toString())
  }

  const postTimeline = useCallback(
    (newText: string, beforeText?: string) => {
      const baseText = pendingTimelineBaseRef.current ?? beforeText ?? beforeLocalEditRef.current ?? lastLoggedTextRef.current
      pendingTimelineBaseRef.current = baseText
      pendingTimelineNextRef.current = newText
      beforeLocalEditRef.current = null

      if (postTimerRef.current) window.clearTimeout(postTimerRef.current)
      postTimerRef.current = window.setTimeout(async () => {
        const prev = pendingTimelineBaseRef.current ?? lastLoggedTextRef.current
        const next = pendingTimelineNextRef.current
        pendingTimelineBaseRef.current = null
        pendingTimelineNextRef.current = ''
        lastLoggedTextRef.current = next

        if (prev === next) return
        const summary = summarizeEdit(prev, next)

        try {
          await fetch(`/api/room/${encodeURIComponent(room)}/timeline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actor: displayName || '访客', summary }),
          })
        } catch {
          // ignore
        }
      }, 600)
    },
    [displayName, room],
  )

  const onLocalEdit = useCallback(
    (newText: string, beforeText?: string) => {
      postTimeline(newText, beforeText)
    },
    [postTimeline],
  )

  const onSplitPointerDown = (e: React.PointerEvent) => {
    const row = (e.target as HTMLElement).closest('.editor-row')
    if (!row) return
    const rect = row.getBoundingClientRect()
    dragRef.current = { startX: e.clientX, startPct: splitPct, width: rect.width }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onSplitPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const next = d.startPct + (dx / d.width) * 100
    setSplitPct(Math.min(80, Math.max(20, next)))
  }

  const onSplitPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  const downloadText = useCallback((filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const exportMarkdown = useCallback(() => {
    downloadText(`${room}.md`, mdText, 'text/markdown;charset=utf-8')
  }, [downloadText, mdText, room])

  const buildHtmlDoc = useCallback((title: string, markdown: string) => {
    const body = renderMarkdown(markdown)
    return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { max-width: 920px; margin: 2rem auto; padding: 0 1rem; font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.75; color: #1e293b; }
      pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 12px; overflow-x: auto; }
      code { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; color: #e11d48; font-size: 0.9em; }
      pre code { background: transparent; padding: 0; color: inherit; }
      .md-color, .md-mark { -webkit-box-decoration-break: clone; box-decoration-break: clone; }
      .md-mark { border-radius: 4px; padding: 1px 4px; }
      .md-align { margin: 1em 0; }
      .md-align > :first-child { margin-top: 0; }
      .md-align > :last-child { margin-bottom: 0; }
      .md-align-left { text-align: left; }
      .md-align-center { text-align: center; }
      .md-align-right { text-align: right; }
      blockquote { border-left: 3px solid #cbd5e1; padding-left: 16px; color: #64748b; margin: 1.5em 0; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
      .md-align-center th, .md-align-center td { text-align: center; }
      .md-align-right th, .md-align-right td { text-align: right; }
      th { background: #f8fafc; font-weight: 600; }
      img { max-width: 100%; height: auto; border-radius: 12px; }
      a { color: #0d9488; }
      hr { border: none; height: 1px; background: #e2e8f0; margin: 2em 0; }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`
  }, [])

  const exportHtml = useCallback(() => {
    downloadText(`${room}.html`, buildHtmlDoc(room, mdText), 'text/html;charset=utf-8')
  }, [buildHtmlDoc, downloadText, mdText, room])

  const openHtmlPreview = useCallback(() => {
    const w = window.open('about:blank', '_blank')
    if (!w) return
    w.document.open()
    w.document.write(buildHtmlDoc(`HTML预览 - ${room}`, mdText))
    w.document.close()
  }, [buildHtmlDoc, mdText, room])

  if (!joined) {
    return <UserPanel defaultRoom={readDefaultRoom()} onJoin={onJoin} />
  }

  if (!collab) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
          正在连接…
        </div>
      </div>
    )
  }

  const menuItems = [
    { label: '协作面板', icon: <Pencil size={13} strokeWidth={2.2} />, onClick: () => { setPanelOpen(true); setMenuOpen(false) }, accent: true },
    { label: 'HTML 预览', icon: <Eye size={13} strokeWidth={2.2} />, onClick: () => { openHtmlPreview(); setMenuOpen(false) } },
    { label: '导出 .md', icon: <FileText size={13} strokeWidth={2.2} />, onClick: () => { exportMarkdown(); setMenuOpen(false) } },
    { label: '导出 .html', icon: <FileCode size={13} strokeWidth={2.2} />, onClick: () => { exportHtml(); setMenuOpen(false) } },
    { label: dark ? '浅色模式' : '深色模式', icon: dark ? <Sun size={13} strokeWidth={2.2} /> : <Moon size={13} strokeWidth={2.2} />, onClick: () => { setDark((d) => !d); setMenuOpen(false) } },
    { label: '离开房间', icon: <LogOut size={13} strokeWidth={2.2} />, onClick: () => { setJoined(false); setEditorView(null); setPreviewEl(null); setMenuOpen(false) }, danger: true },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-950">
      {/* ── Header ─────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-3 dark:border-slate-800/80">
        {/* Left: branding + room + status */}
        <div className="flex min-w-0 items-center gap-2 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 shadow-sm shadow-teal-500/20">
            <FileEdit size={14} className="text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
            xfxmd
          </h1>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Hash size={9} className="inline -mt-px" />{room}
          </span>
          {!canEdit && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              <span className="h-1 w-1 animate-pulse rounded-full bg-amber-500" />
              {syncMessage}
            </span>
          )}
        </div>

        {/* Center: users (hidden on narrow screens) */}
        <div className="hidden min-w-0 flex-1 justify-center px-4 md:flex">
          <UserList provider={collab.provider} localClientId={collab.ydoc.clientID} />
        </div>

        {/* Right: dropdown menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Pencil size={13} strokeWidth={2.2} />
            菜单
            <ChevronDown size={12} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="animate-fade-in absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    item.danger
                      ? 'text-red-600 dark:text-red-400'
                      : item.accent
                        ? 'font-medium text-teal-700 dark:text-teal-300'
                        : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Toolbar ────────────────────────────────── */}
      <Toolbar view={editorReady ? editorView : null} disabled={!canEdit} onAction={onLocalEdit} />

      {/* ── Editor + Preview ───────────────────────── */}
      <div
        className="editor-row flex min-h-0 flex-1"
        onPointerMove={onSplitPointerMove}
        onPointerUp={onSplitPointerUp}
        onPointerCancel={onSplitPointerUp}
      >
        <section
          className="flex min-h-0 min-w-0 flex-col border-r border-slate-200/50 dark:border-slate-800/50"
          style={{ flexBasis: `${splitPct}%`, flexGrow: 0, flexShrink: 0 }}
        >
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {editorReady ? (
              <Editor
                key={room}
                ytext={collab.ytext}
                awareness={collab.provider.awareness}
                dark={dark}
                readOnly={!canEdit}
                onViewChange={onViewChange}
                onBeforeLocalEdit={markLocalInput}
                onLocalEdit={onLocalEdit}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
                <div className="max-w-xs rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs leading-relaxed text-amber-800 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  {syncMessage}
                  <br />
                  正在等待协作文档完成同步，完成后再载入编辑器。
                </div>
              </div>
            )}
          </div>
        </section>

        <SyncBar onPointerDown={onSplitPointerDown} />

        <section
          className="flex min-h-0 min-w-0 flex-col"
          style={{ flexBasis: `${100 - splitPct}%`, flexGrow: 0, flexShrink: 0 }}
        >
          <div className="min-h-0 flex-1 overflow-hidden">
            <Preview markdown={mdText} scrollRef={setPreviewEl} />
          </div>
        </section>
      </div>

      {/* ── Collab panel (slide-in drawer) ─────────── */}
      <CollabPanel
        open={panelOpen}
        users={onlineUsers}
        timeline={timeline}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  )
}
