import DOMPurify from 'dompurify'
import { renderMarkdown } from '../utils/markdown'

export type PreviewProps = {
  markdown: string
  scrollRef?: React.RefCallback<HTMLDivElement | null>
}

export function Preview({ markdown, scrollRef }: PreviewProps) {
  const html = DOMPurify.sanitize(renderMarkdown(markdown), {
    ADD_ATTR: ['target', 'style'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  })

  return (
    <div
      ref={scrollRef}
      className="pre-md h-full min-h-0 overflow-auto bg-white px-6 py-5 dark:bg-slate-950"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
