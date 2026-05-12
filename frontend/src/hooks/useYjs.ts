import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { withAlpha } from '../utils/colors'

const Y_TEXT_KEY = 'markdown'
// ygo has a bug in EncodeStateAsUpdateV1 that corrupts split items during
// resync step2.  We disable resyncInterval entirely and instead keep the
// connection alive with periodic awareness queries (messageQueryAwareness=3).
// The y-websocket library disconnects after 30 s without a received message,
// so we send a query every 10 s — the server replies with awareness state,
// which refreshes wsLastMessageReceived without triggering the buggy sync path.
const KEEPALIVE_INTERVAL_MS = 10000

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
      resyncInterval: -1,
      params: resetAt > 0 ? { resetAt: String(resetAt) } : {},
    })
    let active = true
    let checkingReset = false

    // Custom keepalive: send messageQueryAwareness (type 3) periodically.
    // The server replies with awareness state, keeping wsLastMessageReceived
    // fresh without triggering the buggy EncodeStateAsUpdateV1 path.
    const keepaliveTimer = window.setInterval(() => {
      const ws = provider.ws
      if (ws && ws.readyState === WebSocket.OPEN) {
        const buf = new Uint8Array(1)
        buf[0] = 3 // messageQueryAwareness as a single-byte VarUint
        ws.send(buf)
      }
    }, KEEPALIVE_INTERVAL_MS)

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
        setReady(false)
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
      window.clearInterval(keepaliveTimer)
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
