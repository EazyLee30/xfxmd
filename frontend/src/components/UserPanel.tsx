import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { colorFromName, nextRandomColor } from '../utils/colors'
import { FileEdit, Shuffle, LogIn } from 'lucide-react'

export type UserPanelProps = {
  defaultRoom: string
  onJoin: (name: string, room: string, color: string) => void
}

export function UserPanel({ defaultRoom, onJoin }: UserPanelProps) {
  const [name, setName] = useState('')
  const [room, setRoom] = useState(defaultRoom)
  const [pick, setPick] = useState(() => nextRandomColor())

  const previewColor = useMemo(() => {
    const n = name.trim()
    if (n.length > 0) return colorFromName(n)
    return pick
  }, [name, pick])

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden p-6">
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl dark:bg-teal-500/5" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/5" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-300/8 blur-3xl dark:bg-amber-400/4" />
      </div>

      {/* Content */}
      <div className="animate-fade-in relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="animate-float flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20 dark:from-teal-400 dark:to-teal-500">
            <FileEdit size={22} className="text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              xfxmd
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              实时协作 Markdown 编辑器
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-black/20">
          {/* Name */}
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            显示名称
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="给自己起个名字"
            autoFocus
            className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
          />

          {/* Room */}
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            房间号
          </label>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="default"
            className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
          />

          {/* Color picker row */}
          <div className="mb-5 flex items-center gap-3">
            <button
              type="button"
              className="h-8 w-8 shrink-0 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 dark:border-slate-800"
              style={{ backgroundColor: previewColor }}
              title="你的光标颜色"
              onClick={() => setPick(nextRandomColor())}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {name.trim() ? '昵称决定颜色，所有人一致' : '点击色块换颜色'}
              </p>
            </div>
            <button
              type="button"
              className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={() => setPick(nextRandomColor())}
            >
              <Shuffle size={12} />
              随机
            </button>
          </div>

          {/* Join button */}
          <button
            type="button"
            onClick={() => onJoin(name.trim() || '访客', room.trim() || 'default', previewColor)}
            className={clsx(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all',
              'bg-gradient-to-r from-teal-500 to-teal-600 shadow-md shadow-teal-500/25',
              'hover:from-teal-400 hover:to-teal-500 hover:shadow-lg hover:shadow-teal-500/30',
              'active:scale-[0.98]',
            )}
          >
            <LogIn size={16} strokeWidth={2.2} />
            进入编辑
          </button>
        </div>

        {/* Footer hint */}
        <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
          无需注册 · 分享房间号即可多人协作
        </p>
      </div>
    </div>
  )
}
