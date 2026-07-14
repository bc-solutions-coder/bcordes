import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import * as pkg from './index'

describe('@bcordes/query entry point', () => {
  it('exposes getContext, which mints a fresh QueryClient', () => {
    expect(typeof pkg.getContext).toBe('function')

    const ctx = pkg.getContext()
    expect(ctx.queryClient).toBeInstanceOf(QueryClient)
    expect(pkg.getContext().queryClient).not.toBe(ctx.queryClient)
  })

  it('exposes Provider', () => {
    expect(typeof pkg.Provider).toBe('function')
  })

  it('does not re-export the devtools panel, which stays on its own subpath so @tanstack/react-query-devtools is not pulled into the app bundle', () => {
    expect(Object.keys(pkg).sort()).toEqual(['Provider', 'getContext'])
  })
})
