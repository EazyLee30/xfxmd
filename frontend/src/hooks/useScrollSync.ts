import { useEffect, useRef } from 'react'
import type { EditorView } from '@codemirror/view'

type Source = 'editor' | 'preview'

/**
 * Proportional scroll sync between CodeMirror scroller and preview pane.
 * Uses a flag to prevent feedback loops.
 */
export function useScrollSync(
  editorView: EditorView | null,
  previewEl: HTMLDivElement | null,
  enabled: boolean,
): void {
  const active = useRef<Source | null>(null)
  const raf = useRef<number>(0)

  useEffect(() => {
    if (!enabled || !editorView || !previewEl) return

    const editorScroll = editorView.scrollDOM

    const scrollPreviewFromEditor = () => {
      const eMax = editorScroll.scrollHeight - editorScroll.clientHeight
      const pMax = previewEl.scrollHeight - previewEl.clientHeight
      if (eMax <= 0 || pMax <= 0) {
        previewEl.scrollTop = 0
        return
      }
      const ratio = editorScroll.scrollTop / eMax
      previewEl.scrollTop = ratio * pMax
    }

    const scrollEditorFromPreview = () => {
      const eMax = editorScroll.scrollHeight - editorScroll.clientHeight
      const pMax = previewEl.scrollHeight - previewEl.clientHeight
      if (eMax <= 0 || pMax <= 0) {
        editorScroll.scrollTop = 0
        return
      }
      const ratio = previewEl.scrollTop / pMax
      editorScroll.scrollTop = ratio * eMax
    }

    const onEditorScroll = () => {
      if (active.current === 'preview') return
      active.current = 'editor'
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => {
        scrollPreviewFromEditor()
        active.current = null
      })
    }

    const onPreviewScroll = () => {
      if (active.current === 'editor') return
      active.current = 'preview'
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => {
        scrollEditorFromPreview()
        active.current = null
      })
    }

    editorScroll.addEventListener('scroll', onEditorScroll, { passive: true })
    previewEl.addEventListener('scroll', onPreviewScroll, { passive: true })

    return () => {
      editorScroll.removeEventListener('scroll', onEditorScroll)
      previewEl.removeEventListener('scroll', onPreviewScroll)
      cancelAnimationFrame(raf.current)
    }
  }, [editorView, previewEl, enabled])
}
