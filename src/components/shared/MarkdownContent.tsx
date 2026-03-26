import DOMPurify from 'isomorphic-dompurify'
import { marked } from 'marked'

// Open external links in new tab (matches previous behavior)
const renderer = new marked.Renderer()
renderer.link = ({ href, text }) => {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
}

marked.use({ renderer })

interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const rawHtml = marked.parse(content, { async: false })
  const safeHtml = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['target'],
  })
  // Content is sanitized by DOMPurify before rendering
  return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
}
