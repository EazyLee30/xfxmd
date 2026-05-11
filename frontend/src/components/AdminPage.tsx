import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { renderMarkdown } from '../utils/markdown'
import { yjsBaseUrl } from '../hooks/useYjs'
import { Trash2 } from 'lucide-react'

interface RoomInfo {
  name: string
  size: number
}

async function readRoomDeletedAt(roomName: string): Promise<number> {
  try {
    const res = await fetch(`/api/room/${encodeURIComponent(roomName)}/info`)
    if (!res.ok) return 0
    const data = (await res.json()) as { deletedAt?: number }
    return typeof data.deletedAt === 'number' ? data.deletedAt : 0
  } catch {
    return 0
  }
}

export function AdminPage() {
  const [token, setToken] = useState('')
  const [inputToken, setInputToken] = useState('')
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/admin/rooms', {
        headers: { 'X-Admin-Token': token },
      })
      if (!res.ok) {
        setError('认证失败')
        return
      }
      const data = await res.json()
      setRooms(data.rooms || [])
      setError('')
    } catch {
      setError('网络错误')
    }
  }

  const deleteRoom = async (roomName: string) => {
    try {
      const res = await fetch(`/api/admin/rooms/${encodeURIComponent(roomName)}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Token': token },
      })
      if (!res.ok) {
        setError('删除失败')
        return
      }
      setDeleteConfirm(null)
      if (selectedRoom === roomName) {
        setSelectedRoom(null)
        setContent('')
      }
      fetchRooms()
    } catch {
      setError('删除失败')
    }
  }

  const loadRoomContent = async (roomName: string) => {
    setLoading(true)
    setSelectedRoom(roomName)
    setContent('')

    try {
      const ydoc = new Y.Doc()
      const ytext = ydoc.getText('markdown')
      let synced = false
      const resetAt = await readRoomDeletedAt(roomName)

      const provider = new WebsocketProvider(yjsBaseUrl(), roomName, ydoc, {
        connect: true,
        disableBc: true,
        maxBackoffTime: 5000,
        params: resetAt > 0 ? { resetAt: String(resetAt) } : {},
      })

      await new Promise<void>((resolve) => {
        const onSync = (isSynced: boolean) => {
          if (isSynced) {
            synced = true
            resolve()
          }
        }
        provider.on('sync', onSync)
        setTimeout(() => {
          if (!synced) resolve()
        }, 5000)
      })

      setContent(ytext.toString())
      provider.destroy()
      ydoc.destroy()
    } catch {
      setError('加载房间内容失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchRooms()
    }
  }, [token])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setToken(inputToken)
  }

  if (!token) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <form onSubmit={handleLogin} className="w-80 rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-900">
          <h1 className="mb-6 text-center text-xl font-bold text-slate-800 dark:text-slate-100">
            管理后台
          </h1>
          <input
            type="password"
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            placeholder="输入管理密码"
            className="mb-4 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            autoFocus
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            登录
          </button>
          {error && <p className="mt-3 text-center text-xs text-red-500">{error}</p>}
        </form>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950">
      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-80 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="mb-2 text-lg font-bold text-slate-800 dark:text-slate-100">确认删除</h3>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              确定要删除房间 <span className="font-mono font-medium">{deleteConfirm}</span> 吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                取消
              </button>
              <button
                onClick={() => deleteRoom(deleteConfirm)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-100">房间列表</h2>
        <div className="space-y-1">
          {rooms.map((room) => (
            <div
              key={room.name}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                selectedRoom === room.name
                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <button
                onClick={() => loadRoomContent(room.name)}
                className="flex-1 text-left"
              >
                <div className="font-medium">{room.name}</div>
                <div className="text-xs text-slate-400">{(room.size / 1024).toFixed(1)} KB</div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteConfirm(room.name)
                }}
                className="ml-2 rounded p-1 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                title="删除房间"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {rooms.length === 0 && (
            <p className="text-xs text-slate-400">暂无房间</p>
          )}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
            加载中...
          </div>
        ) : selectedRoom ? (
          <div>
            <h3 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">
              #{selectedRoom}
            </h3>
            <div
              className="prose prose-slate max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content || '(空房间)') }}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            选择一个房间查看内容
          </div>
        )}
      </main>
    </div>
  )
}
