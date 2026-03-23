import type React from 'react'

// Note: This component only processes trusted content from local MDX blog files.
// It is NOT used with user-generated content.

function processInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    )
}

function processContent(content: string): Array<React.ReactNode> {
  const lines = content.split('\n')
  const elements: Array<React.ReactNode> = []
  let currentParagraph: Array<string> = []
  let inCodeBlock = false
  let codeBlockContent: Array<string> = []
  let codeBlockLang = ''
  let inList = false
  let listItems: Array<string> = []
  let listType: 'ul' | 'ol' = 'ul'
  let keyIndex = 0

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim()
      if (text) {
        elements.push(
          <p
            key={keyIndex++}
            dangerouslySetInnerHTML={{ __html: processInlineMarkdown(text) }}
          />,
        )
      }
      currentParagraph = []
    }
  }

  const flushList = () => {
    if (listItems.length > 0) {
      const ListTag = listType
      elements.push(
        <ListTag key={keyIndex++}>
          {listItems.map((item, i) => (
            <li
              key={i}
              dangerouslySetInnerHTML={{ __html: processInlineMarkdown(item) }}
            />
          ))}
        </ListTag>,
      )
      listItems = []
      inList = false
    }
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={keyIndex++} data-language={codeBlockLang}>
            <code>{codeBlockContent.join('\n')}</code>
          </pre>,
        )
        codeBlockContent = []
        codeBlockLang = ''
        inCodeBlock = false
      } else {
        flushParagraph()
        flushList()
        inCodeBlock = true
        codeBlockLang = line.slice(3).trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    if (line.startsWith('## ')) {
      flushParagraph()
      flushList()
      elements.push(
        <h2
          key={keyIndex++}
          dangerouslySetInnerHTML={{
            __html: processInlineMarkdown(line.slice(3)),
          }}
        />,
      )
      continue
    }

    if (line.startsWith('### ')) {
      flushParagraph()
      flushList()
      elements.push(
        <h3
          key={keyIndex++}
          dangerouslySetInnerHTML={{
            __html: processInlineMarkdown(line.slice(4)),
          }}
        />,
      )
      continue
    }

    if (line.startsWith('#### ')) {
      flushParagraph()
      flushList()
      elements.push(
        <h4
          key={keyIndex++}
          dangerouslySetInnerHTML={{
            __html: processInlineMarkdown(line.slice(5)),
          }}
        />,
      )
      continue
    }

    if (line.match(/^---+$/)) {
      flushParagraph()
      flushList()
      elements.push(<hr key={keyIndex++} />)
      continue
    }

    if (line.startsWith('> ')) {
      flushParagraph()
      flushList()
      elements.push(
        <blockquote key={keyIndex++}>
          <p
            dangerouslySetInnerHTML={{
              __html: processInlineMarkdown(line.slice(2)),
            }}
          />
        </blockquote>,
      )
      continue
    }

    if (line.match(/^[-*] /)) {
      flushParagraph()
      if (inList && listType !== 'ul') flushList()
      inList = true
      listType = 'ul'
      listItems.push(line.slice(2))
      continue
    }

    if (line.match(/^\d+\. /)) {
      flushParagraph()
      if (inList && listType !== 'ol') flushList()
      inList = true
      listType = 'ol'
      listItems.push(line.replace(/^\d+\. /, ''))
      continue
    }

    if (line.trim() === '') {
      flushParagraph()
      flushList()
      continue
    }

    currentParagraph.push(line)
  }

  flushParagraph()
  flushList()

  return elements
}

export function MarkdownContent({ content }: { content: string }) {
  const elements = processContent(content)
  return <>{elements}</>
}
