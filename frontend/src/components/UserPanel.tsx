import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { colorFromName, nextRandomColor } from '../utils/colors'
import { buildDiceBearAvatarUrl, DICEBEAR_STYLES, nextAvatarSeed } from '../utils/avatars'
import { FileEdit, Shuffle, LogIn } from 'lucide-react'

export type UserPanelProps = {
  defaultRoom: string
  onJoin: (name: string, room: string, color: string, avatarUrl: string) => void
}

export function UserPanel({ defaultRoom, onJoin }: UserPanelProps) {
  const [name, setName] = useState('')
  const [room, setRoom] = useState(defaultRoom)
  const [pick, setPick] = useState(() => nextRandomColor())
  const [avatarStyle, setAvatarStyle] = useState(DICEBEAR_STYLES[0].id)
  const [avatarSeed, setAvatarSeed] = useState(() => nextAvatarSeed())

  const previewColor = useMemo(() => {
    const n = name.trim()
    if (n.length > 0) return colorFromName(n)
    return pick
  }, [name, pick])
  const avatarUrl = useMemo(
    () => buildDiceBearAvatarUrl(avatarStyle, avatarSeed),
    [avatarSeed, avatarStyle],
  )

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

          {/* Avatar picker */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">
              头像
            </label>
            <div className="mb-3 flex items-center gap-3">
              <button
                type="button"
                className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-md ring-1 ring-slate-200 transition-transform hover:scale-105 dark:border-slate-800 dark:bg-slate-800 dark:ring-slate-700"
                title="换一个头像"
                onClick={() => {
                  setAvatarSeed(nextAvatarSeed())
                  setPick(nextRandomColor())
                }}
              >
                <img
                  src={avatarUrl}
                  alt="你的头像"
                  className="h-full w-full rounded-full object-cover"
                />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  选择 DiceBear 风格，点击头像或随机生成新形象。
                </p>
              </div>
              <button
                type="button"
                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                onClick={() => {
                  setAvatarSeed(nextAvatarSeed())
                  setPick(nextRandomColor())
                }}
              >
                <Shuffle size={12} />
                随机
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {DICEBEAR_STYLES.map((style) => {
                const selected = style.id === avatarStyle
                return (
                  <button
                    key={style.id}
                    type="button"
                    className={clsx(
                      'flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-left text-[11px] transition',
                      selected
                        ? 'border-teal-400 bg-teal-50 text-teal-700 ring-2 ring-teal-400/20 dark:border-teal-500 dark:bg-teal-500/10 dark:text-teal-200'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800',
                    )}
                    onClick={() => setAvatarStyle(style.id)}
                  >
                    <span className="h-5 w-5 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                      <img
                        src={buildDiceBearAvatarUrl(style.id, avatarSeed)}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    </span>
                    <span className="truncate">{style.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Join button */}
          <button
            type="button"
            onClick={() => onJoin(name.trim() || '访客', room.trim() || 'default', previewColor, avatarUrl)}
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
