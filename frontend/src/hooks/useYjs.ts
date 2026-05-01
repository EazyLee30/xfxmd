import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { withAlpha } from '../utils/colors'

const Y_TEXT_KEY = 'markdown'

export function yjsBaseUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}/yjs`
}

export type CollabBundle = {
  ydoc: Y.Doc
  ytext: Y.Text
  provider: WebsocketProvider
}

/**
 * @param enabled when false, no WebSocket / Y.Doc is created.
 */
export function useYjs(
  enabled: boolean,
  room: string,
  displayName: string,
  color: string,
): {
  collab: CollabBundle | null
  synced: boolean
} {
  const [collab, setCollab] = useState<CollabBundle | null>(null)
  const [synced, setSynced] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setCollab(null)
      setSynced(false)
      return
    }

    const ydoc = new Y.Doc()
    const ytext = ydoc.getText(Y_TEXT_KEY)
    const provider = new WebsocketProvider(yjsBaseUrl(), room, ydoc, {
      connect: true,
      disableBc: true,
      maxBackoffTime: 5000,
    })

    const onSync = (isSynced: boolean) => setSynced(isSynced)
    provider.on('sync', onSync)

    setCollab({ ydoc, ytext, provider })

    return () => {
      provider.off('sync', onSync)
      provider.awareness.setLocalState(null)
      provider.destroy()
      ydoc.destroy()
      setCollab(null)
      setSynced(false)
    }
  }, [enabled, room])

  useEffect(() => {
    if (!enabled || !collab) return
    collab.provider.awareness.setLocalState({
      user: {
        name: displayName || '访客',
        color,
        colorLight: withAlpha(color),
      },
    })
  }, [enabled, collab, displayName, color])

  return { collab, synced }
}
