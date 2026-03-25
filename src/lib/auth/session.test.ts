import { describe, expect, it, vi } from 'vitest'

vi.stubEnv('SESSION_SECRET', 'a]3kf9$mLp2xQz!vR7nW^tY0uBc8dEhJ')

vi.mock('iron-webcrypto', () => ({
  defaults: {},
  seal: vi.fn(),
  unseal: vi.fn(),
}))

vi.mock('@tanstack/react-start/server', () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}))

const { withRefreshLock } = await import('./session')

describe('withRefreshLock', () => {
  it('executes the callback and returns its resolved value', async () => {
    const result = await withRefreshLock('session-1', () =>
      Promise.resolve('token-abc'),
    )
    expect(result).toBe('token-abc')
  })

  it('shares the same in-flight promise for concurrent calls with the same sessionId', async () => {
    let resolve!: (value: string) => void
    const pending = new Promise<string>((r) => {
      resolve = r
    })
    const callback = vi.fn(() => pending)

    const first = withRefreshLock('session-2', callback)
    const second = withRefreshLock('session-2', callback)

    resolve('shared-result')

    const [r1, r2] = await Promise.all([first, second])
    expect(r1).toBe('shared-result')
    expect(r2).toBe('shared-result')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('runs independently for different sessionIds', async () => {
    let resolveA!: (value: string) => void
    let resolveB!: (value: string) => void
    const pendingA = new Promise<string>((r) => {
      resolveA = r
    })
    const pendingB = new Promise<string>((r) => {
      resolveB = r
    })
    const callbackA = vi.fn(() => pendingA)
    const callbackB = vi.fn(() => pendingB)

    const promiseA = withRefreshLock('session-a', callbackA)
    const promiseB = withRefreshLock('session-b', callbackB)

    expect(callbackA).toHaveBeenCalledTimes(1)
    expect(callbackB).toHaveBeenCalledTimes(1)

    resolveA('result-a')
    resolveB('result-b')

    const [rA, rB] = await Promise.all([promiseA, promiseB])
    expect(rA).toBe('result-a')
    expect(rB).toBe('result-b')
  })

  it('removes the lock entry after callback resolves so next call runs fresh', async () => {
    const callbackFirst = vi.fn(() => Promise.resolve('first'))
    const callbackSecond = vi.fn(() => Promise.resolve('second'))

    const r1 = await withRefreshLock('session-3', callbackFirst)
    expect(r1).toBe('first')
    expect(callbackFirst).toHaveBeenCalledTimes(1)

    const r2 = await withRefreshLock('session-3', callbackSecond)
    expect(r2).toBe('second')
    expect(callbackSecond).toHaveBeenCalledTimes(1)
  })

  it('propagates rejection to all waiters and cleans up the lock entry', async () => {
    let reject!: (error: Error) => void
    const pending = new Promise<string>((_, r) => {
      reject = r
    })
    const callback = vi.fn(() => pending)

    const first = withRefreshLock('session-4', callback)
    const second = withRefreshLock('session-4', callback)

    const error = new Error('refresh failed')
    reject(error)

    await expect(first).rejects.toThrow('refresh failed')
    await expect(second).rejects.toThrow('refresh failed')
    expect(callback).toHaveBeenCalledTimes(1)

    // Lock should be cleaned up — a new call should invoke the callback
    const recovery = vi.fn(() => Promise.resolve('recovered'))
    const r3 = await withRefreshLock('session-4', recovery)
    expect(r3).toBe('recovered')
    expect(recovery).toHaveBeenCalledTimes(1)
  })
})
