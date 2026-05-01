import {
  Users,
  Clock,
  X,
  UserCircle,
  Sparkles,
} from 'lucide-react'

export type OnlineUser = {
  clientId: number
  name: string
  color: string
}

export type TimelineItem = {
  id: number
  actor: string
  summary: string
  createdAt: string
}

type CollabPanelProps = {
  open: boolean
  users: OnlineUser[]
  timeline: TimelineItem[]
  onClose: () => void
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = Date.now()
  const diff = Math.floor((now - d.getTime()) / 1000)
  if (diff < 10) return '刚刚'
  if (diff < 60) return `${diff}秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return formatTime(iso)
}

export function CollabPanel({ open, users, timeline, onClose }: CollabPanelProps) {
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/10 dark:bg-black/20"
        onClick={onClose}
      />
      {/* Panel */}
      <aside className="animate-slide-in fixed bottom-0 right-0 top-0 z-40 flex w-80 flex-col border-l border-slate-200 bg-white/95 shadow-2xl backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Sparkles size={14} className="text-teal-500" strokeWidth={2.2} />
            协作面板
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X size={14} strokeWidth={2.2} />
          </button>
        </div>

        {/* Users */}
        <section className="shrink-0 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Users size={12} strokeWidth={2.2} />
            在线 · {users.length}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {users.map((u) => (
              <div
                key={u.clientId}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900"
                  style={{ backgroundColor: u.color }}
                />
                <span className="text-slate-700 dark:text-slate-200">{u.name}</span>
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-xs text-slate-400 dark:text-slate-500">暂无在线用户</div>
            )}
          </div>
        </section>

        {/* Timeline */}
        <section className="min-h-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 border-b border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <Clock size={12} strokeWidth={2.2} />
            编辑记录
          </div>
          <div className="h-full space-y-0.5 overflow-auto p-2">
            {timeline.map((item, i) => (
              <div
                key={item.id}
                className="group rounded-lg px-3 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-900/50"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                    <UserCircle size={12} strokeWidth={2} />
                    {item.actor}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                    {formatRelative(item.createdAt)}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {item.summary}
                </p>
              </div>
            ))}
            {timeline.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-xs text-slate-400 dark:text-slate-500">
                <Clock size={20} className="mb-2 opacity-40" />
                暂无编辑记录
              </div>
            )}
          </div>
        </section>
      </aside>
    </>
  )
}
