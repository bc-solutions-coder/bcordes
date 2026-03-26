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

// Content comes exclusively from trusted local MDX blog files (src/content/),
// not from user input, so sanitization is not required here.
export function MarkdownContent({ content }: MarkdownContentProps) {
  const html = marked.parse(content, { async: false })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
