import { useEffect, useState } from 'react'
import type { WebsocketProvider } from 'y-websocket'
import { buildDiceBearAvatarUrl, safeDiceBearAvatarUrl } from '../utils/avatars'

type UserEntry = { clientId: number; name: string; color: string; avatarUrl?: string }

export type UserListProps = {
  provider: WebsocketProvider
  localClientId: number
}

export function UserList({ provider, localClientId }: UserListProps) {
  const [users, setUsers] = useState<UserEntry[]>([])
  const maxVisibleUsers = 6

  useEffect(() => {
    const aw = provider.awareness

    const refresh = () => {
      const next: UserEntry[] = []
      aw.getStates().forEach((state: { user?: { name?: string; color?: string; avatarUrl?: string } }, clientId: number) => {
        const u = state.user
        if (!u?.name) return
        next.push({
          clientId,
          name: u.name,
          color: u.color ?? '#64748b',
          avatarUrl: safeDiceBearAvatarUrl(u.avatarUrl) ?? buildDiceBearAvatarUrl('adventurer', u.name),
        })
      })
      next.sort((a, b) => a.name.localeCompare(b.name))
      setUsers(next)
    }

    refresh()
    aw.on('change', refresh)
    return () => {
      aw.off('change', refresh)
    }
  }, [provider])

  const visibleUsers = users.slice(0, maxVisibleUsers)
  const hiddenUsers = users.slice(maxVisibleUsers)
  const hiddenNames = hiddenUsers.map((u) => u.name).join('、')

  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      <span className="mr-1 inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
        </span>
        {users.length}
      </span>
      {visibleUsers.map((u) => (
        <span
          key={u.clientId}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-1.5 py-0.5 text-slate-600 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300"
          title={u.clientId === localClientId ? '你' : ''}
        >
          <span
            className="h-5 w-5 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-white dark:bg-slate-700 dark:ring-slate-900"
            style={{ boxShadow: `0 0 0 1px ${u.color}` }}
          >
            <img
              src={u.avatarUrl}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          </span>
          <span className="max-w-[60px] truncate">{u.name}{u.clientId === localClientId ? '(我)' : ''}</span>
        </span>
      ))}
      {hiddenUsers.length > 0 && (
        <span
          className="inline-flex items-center rounded-full border border-dashed border-slate-300 bg-slate-50/80 px-1.5 py-0.5 text-slate-400 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-500"
          title={hiddenNames}
        >
          +{hiddenUsers.length}
        </span>
      )}
      {users.length === 0 && <span className="text-slate-400 dark:text-slate-500">连接中…</span>}
    </div>
  )
}
