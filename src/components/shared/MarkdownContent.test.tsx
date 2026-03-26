import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { MarkdownContent } from './MarkdownContent'

describe('MarkdownContent', () => {
  it('renders a paragraph from plain text', () => {
    const { container } = render(<MarkdownContent content="Hello world" />)
    const p = container.querySelector('p')
    expect(p).not.toBeNull()
    expect(p?.textContent).toBe('Hello world')
  })

  it('renders h2 headings', () => {
    const { container } = render(<MarkdownContent content="## My Heading" />)
    const h2 = container.querySelector('h2')
    expect(h2).not.toBeNull()
    expect(h2?.textContent).toBe('My Heading')
  })

  it('renders h3 headings', () => {
    const { container } = render(<MarkdownContent content="### Sub Heading" />)
    const h3 = container.querySelector('h3')
    expect(h3).not.toBeNull()
    expect(h3?.textContent).toBe('Sub Heading')
  })

  it('renders h4 headings', () => {
    const { container } = render(
      <MarkdownContent content="#### Small Heading" />,
    )
    const h4 = container.querySelector('h4')
    expect(h4).not.toBeNull()
    expect(h4?.textContent).toBe('Small Heading')
  })

  it('renders bold text', () => {
    const { container } = render(
      <MarkdownContent content="This is **bold** text" />,
    )
    const strong = container.querySelector('strong')
    expect(strong).not.toBeNull()
    expect(strong?.textContent).toBe('bold')
  })

  it('renders italic text', () => {
    const { container } = render(
      <MarkdownContent content="This is *italic* text" />,
    )
    const em = container.querySelector('em')
    expect(em).not.toBeNull()
    expect(em?.textContent).toBe('italic')
  })

  it('renders inline code', () => {
    const { container } = render(
      <MarkdownContent content="Use `console.log` here" />,
    )
    const code = container.querySelector('code')
    expect(code).not.toBeNull()
    expect(code?.textContent).toBe('console.log')
  })

  it('renders links with target _blank', () => {
    const { container } = render(
      <MarkdownContent content="Visit [Google](https://google.com)" />,
    )
    const link = container.querySelector('a')
    expect(link).not.toBeNull()
    expect(link?.textContent).toBe('Google')
    expect(link?.getAttribute('href')).toBe('https://google.com')
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders unordered lists', () => {
    const content = '- Item one\n- Item two\n- Item three'
    const { container } = render(<MarkdownContent content={content} />)
    const ul = container.querySelector('ul')
    expect(ul).not.toBeNull()
    const items = container.querySelectorAll('li')
    expect(items).toHaveLength(3)
    expect(items[0].textContent).toBe('Item one')
    expect(items[1].textContent).toBe('Item two')
    expect(items[2].textContent).toBe('Item three')
  })

  it('renders ordered lists', () => {
    const content = '1. First\n2. Second\n3. Third'
    const { container } = render(<MarkdownContent content={content} />)
    const ol = container.querySelector('ol')
    expect(ol).not.toBeNull()
    const items = container.querySelectorAll('li')
    expect(items).toHaveLength(3)
    expect(items[0].textContent).toBe('First')
  })

  it('renders blockquotes', () => {
    const { container } = render(
      <MarkdownContent content="> This is a quote" />,
    )
    const blockquote = container.querySelector('blockquote')
    expect(blockquote).not.toBeNull()
    expect(blockquote?.textContent).toBe('This is a quote')
  })

  it('renders horizontal rules', () => {
    const { container } = render(<MarkdownContent content="---" />)
    const hr = container.querySelector('hr')
    expect(hr).not.toBeNull()
  })

  it('renders code blocks with language attribute', () => {
    const content = '```typescript\nconst x = 1\n```'
    const { container } = render(<MarkdownContent content={content} />)
    const pre = container.querySelector('pre')
    expect(pre).not.toBeNull()
    expect(pre?.getAttribute('data-language')).toBe('typescript')
    const code = pre?.querySelector('code')
    expect(code?.textContent).toBe('const x = 1')
  })

  it('renders mixed content correctly', () => {
    const content = [
      '## Title',
      '',
      'A paragraph with **bold** and `code`.',
      '',
      '- List item',
      '',
      '> A quote',
    ].join('\n')
    const { container } = render(<MarkdownContent content={content} />)
    expect(container.querySelector('h2')?.textContent).toBe('Title')
    expect(container.querySelector('strong')?.textContent).toBe('bold')
    expect(container.querySelector('code')?.textContent).toBe('code')
    expect(container.querySelector('ul')).not.toBeNull()
    expect(container.querySelector('blockquote')).not.toBeNull()
  })

  it('renders empty content without errors', () => {
    const { container } = render(<MarkdownContent content="" />)
    expect(container.innerHTML).toBe('')
  })

  it('handles asterisk-style unordered lists', () => {
    const content = '* Alpha\n* Beta'
    const { container } = render(<MarkdownContent content={content} />)
    const ul = container.querySelector('ul')
    expect(ul).not.toBeNull()
    expect(container.querySelectorAll('li')).toHaveLength(2)
  })
})
