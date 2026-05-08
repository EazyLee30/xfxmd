import { useEffect, useMemo, useRef } from 'react'
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
  readOnly?: boolean
  onViewChange: (view: EditorView | null) => void
  onLocalEdit?: (text: string) => void
}

export function Editor({ ytext, awareness, dark, readOnly = false, onViewChange, onLocalEdit }: EditorProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const themeComp = useMemo(() => new Compartment(), [])
  const editableComp = useMemo(() => new Compartment(), [])
  const darkRef = useRef(dark)
  const readOnlyRef = useRef(readOnly)
  const onViewChangeRef = useRef(onViewChange)

  useEffect(() => {
    darkRef.current = dark
  }, [dark])

  useEffect(() => {
    readOnlyRef.current = readOnly
  }, [readOnly])

  useEffect(() => {
    onViewChangeRef.current = onViewChange
  }, [onViewChange])

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
        editableComp.of([
          EditorState.readOnly.of(readOnlyRef.current),
          EditorView.editable.of(!readOnlyRef.current),
        ]),
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
  }, [ytext, awareness, themeComp, editableComp])

  useEffect(() => {
    const v = viewRef.current
    if (!v) return
    v.dispatch({
      effects: themeComp.reconfigure(dark ? oneDark : lightTheme),
    })
  }, [dark, themeComp])

  useEffect(() => {
    const v = viewRef.current
    if (!v) return
    v.dispatch({
      effects: editableComp.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
    })
  }, [editableComp, readOnly])

  return <div ref={parentRef} className="h-full min-h-0 w-full overflow-hidden" />
}
