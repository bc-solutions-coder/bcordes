import { isValidElement } from 'react'
import { describe, expect, it } from 'vitest'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import devtoolsPlugin from './devtools'
import type { ReactElement } from 'react'

describe('devtools', () => {
  it('default-exports a TanStack Devtools plugin named "Tanstack Query"', () => {
    expect(devtoolsPlugin.name).toBe('Tanstack Query')
  })

  it('renders the real ReactQueryDevtoolsPanel', () => {
    expect(isValidElement(devtoolsPlugin.render)).toBe(true)
    expect((devtoolsPlugin.render as ReactElement).type).toBe(
      ReactQueryDevtoolsPanel,
    )
  })
})
