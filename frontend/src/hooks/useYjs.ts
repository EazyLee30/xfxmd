import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { withAlpha } from '../utils/colors'

const Y_TEXT_KEY = 'markdown'
const RESYNC_INTERVAL_MS = 15000

export function yjsBaseUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}/yjs`
}

async function readRoomDeletedAt(room: string): Promise<number> {
  try {
    const res = await fetch(`/api/room/${encodeURIComponent(room)}/info`)
    if (!res.ok) return 0
    const data = (await res.json()) as { deletedAt?: number }
    return typeof data.deletedAt === 'number' ? data.deletedAt : 0
  } catch {
    return 0
  }
}

export type CollabBundle = {
  ydoc: Y.Doc
  ytext: Y.Text
  provider: WebsocketProvider
}

export type CollabStatus = 'idle' | 'connecting' | 'connected' | 'disconnected'

/**
 * @param enabled when false, no WebSocket / Y.Doc is created.
 */
export function useYjs(
  enabled: boolean,
  room: string,
  displayName: string,
  color: string,
  avatarUrl: string,
): {
  collab: CollabBundle | null
  synced: boolean
  status: CollabStatus
  ready: boolean
} {
  const [collab, setCollab] = useState<CollabBundle | null>(null)
  const [synced, setSynced] = useState(false)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<CollabStatus>('idle')
  const [resetAt, setResetAt] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      setResetAt(null)
      setReady(false)
      setSynced(false)
      setStatus('idle')
      return
    }

    let active = true
    setStatus('connecting')
    setResetAt(null)
    void readRoomDeletedAt(room).then((deletedAt) => {
      if (active) setResetAt(deletedAt)
    })

    return () => {
      active = false
    }
  }, [enabled, room])

  useEffect(() => {
    if (!enabled || resetAt === null) {
      return
    }

    const ydoc = new Y.Doc()
    const ytext = ydoc.getText(Y_TEXT_KEY)
    const provider = new WebsocketProvider(yjsBaseUrl(), room, ydoc, {
      connect: true,
      disableBc: true,
      maxBackoffTime: 5000,
      resyncInterval: RESYNC_INTERVAL_MS,
      params: resetAt > 0 ? { resetAt: String(resetAt) } : {},
    })
    let active = true
    let checkingReset = false

    const refreshResetAt = () => {
      if (checkingReset) return
      checkingReset = true
      void readRoomDeletedAt(room).then((deletedAt) => {
        checkingReset = false
        if (active && deletedAt > resetAt) {
          setResetAt(deletedAt)
        }
      })
    }

    const onSync = (isSynced: boolean) => {
      setSynced(isSynced)
      if (isSynced) setReady(true)
    }
    const onStatus = ({ status: nextStatus }: { status: CollabStatus }) => {
      setStatus(nextStatus)
      if (nextStatus !== 'connected') {
        setSynced(false)
        refreshResetAt()
      }
    }
    provider.on('sync', onSync)
    provider.on('status', onStatus)
    provider.on('connection-error', refreshResetAt)

    queueMicrotask(() => {
      if (active) setCollab({ ydoc, ytext, provider })
    })

    return () => {
      active = false
      provider.off('sync', onSync)
      provider.off('status', onStatus)
      provider.off('connection-error', refreshResetAt)
      provider.awareness.setLocalState(null)
      provider.destroy()
      ydoc.destroy()
      setCollab(null)
      setSynced(false)
      setReady(false)
      setStatus('idle')
    }
  }, [enabled, room, resetAt])

  useEffect(() => {
    if (!enabled || !collab) return
    collab.provider.awareness.setLocalState({
      user: {
        name: displayName || '访客',
        color,
        colorLight: withAlpha(color),
        avatarUrl,
      },
    })
  }, [enabled, collab, displayName, color, avatarUrl])

  return { collab, synced, status, ready }
}
