import { useEffect, useRef } from 'react'
import { Compartment, EditorState, Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { yCollab } from 'y-codemirror.next'
import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'

const lightTheme = EditorView.theme({
  '&': { height: '100%', backgroundColor: '#ffffff', color: '#0f172a' },
  '.cm-editor': { height: '100%' },
  '.cm-scroller': { fontFamily: 'var(--font-mono, ui-monospace, monospace)' },
  '.cm-gutters': {
    backgroundColor: '#f8fafc',
    color: '#94a3b8',
    borderRight: '1px solid #e2e8f0',
  },
  '.cm-activeLineGutter': { backgroundColor: '#f1f5f9' },
  '.cm-activeLine': { backgroundColor: '#f8fafc80' },
  '.cm-cursor': { borderLeftColor: '#0f172a' },
  '.cm-selectionBackground': { backgroundColor: '#99f6e480 !important' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: '#99f6e480 !important' },
})

export type EditorProps = {
  ytext: Y.Text
  awareness: Awareness
  dark: boolean
  onViewChange: (view: EditorView | null) => void
  onLocalEdit?: (text: string) => void
}

export function Editor({ ytext, awareness, dark, onViewChange, onLocalEdit }: EditorProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const themeComp = useRef(new Compartment()).current
  const darkRef = useRef(dark)
  darkRef.current = dark
  const onViewChangeRef = useRef(onViewChange)
  onViewChangeRef.current = onViewChange

  useEffect(() => {
    const parent = parentRef.current
    if (!parent) return

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        markdown(),
        yCollab(ytext, awareness, { undoManager: false }),
        themeComp.of(darkRef.current ? oneDark : lightTheme),
        EditorView.updateListener.of((vu) => {
          if (!vu.docChanged) return
          const isLocalEdit = vu.transactions.some((tr) => tr.annotation(Transaction.userEvent) != null)
          if (isLocalEdit && onLocalEdit) {
            onLocalEdit(vu.state.doc.toString())
          }
        }),
      ],
    })

    const view = new EditorView({ state, parent })
    viewRef.current = view
    onViewChangeRef.current(view)

    return () => {
      view.destroy()
      viewRef.current = null
      onViewChangeRef.current(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only recreate on collab identity
  }, [ytext, awareness, themeComp])

  useEffect(() => {
    const v = viewRef.current
    if (!v) return
    v.dispatch({
      effects: themeComp.reconfigure(dark ? oneDark : lightTheme),
    })
  }, [dark, themeComp])

  return <div ref={parentRef} className="h-full min-h-0 w-full overflow-hidden" />
}
