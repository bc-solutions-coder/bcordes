import { beforeEach, describe, expect, it, vi } from 'vitest'

import { validateCsrfToken } from './csrf-validation'
import type { H3Event } from 'h3'

const { mockGetSession, mockGetRequestHeader, mockCreateError } = vi.hoisted(
  () => ({
    mockGetSession: vi.fn(),
    mockGetRequestHeader: vi.fn(),
    mockCreateError: vi.fn(
      (opts: { statusCode: number; statusMessage: string }) => {
        const err = new Error(opts.statusMessage) as Error & {
          statusCode: number
          statusMessage: string
        }
        err.statusCode = opts.statusCode
        err.statusMessage = opts.statusMessage
        return err
      },
    ),
  }),
)

vi.mock('@bcordes/auth/session', () => ({
  getSession: mockGetSession,
}))

vi.mock('h3', () => ({
  defineEventHandler: (handler: (event: unknown) => unknown) => handler,
  getRequestHeader: mockGetRequestHeader,
  createError: mockCreateError,
}))

// h3 is mocked above, so the handler only ever reads `method` off the event.
function makeEvent(method: string): H3Event {
  return { method } as unknown as H3Event
}

describe('CSRF validation middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('safe methods pass without CSRF check', () => {
    it.each(['GET', 'HEAD', 'OPTIONS'])(
      '%s requests skip CSRF validation',
      async (method) => {
        const handler = validateCsrfToken()
        const result = await handler(makeEvent(method))

        expect(result).toBeUndefined()
        expect(mockGetSession).not.toHaveBeenCalled()
      },
    )
  })

  describe('unauthenticated requests', () => {
    it('POST with no session passes (anonymous requests allowed)', async () => {
      mockGetSession.mockResolvedValue(null)

      const handler = validateCsrfToken()
      const result = await handler(makeEvent('POST'))

      expect(result).toBeUndefined()
      expect(mockGetRequestHeader).not.toHaveBeenCalled()
    })

    it('POST with session but no csrfToken passes', async () => {
      mockGetSession.mockResolvedValue({ accessToken: 'abc' })

      const handler = validateCsrfToken()
      const result = await handler(makeEvent('POST'))

      expect(result).toBeUndefined()
      expect(mockGetRequestHeader).not.toHaveBeenCalled()
    })
  })

  describe('valid CSRF token', () => {
    it('POST with session + matching x-csrf-token header passes', async () => {
      const token = 'valid-csrf-token-abc123'
      mockGetSession.mockResolvedValue({ csrfToken: token })
      mockGetRequestHeader.mockReturnValue(token)

      const handler = validateCsrfToken()
      const result = await handler(makeEvent('POST'))

      expect(result).toBeUndefined()
      expect(mockGetRequestHeader).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST' }),
        'x-csrf-token',
      )
    })
  })

  describe('invalid CSRF token', () => {
    it('POST with session + mismatched token returns 403', async () => {
      mockGetSession.mockResolvedValue({ csrfToken: 'real-token-xyz' })
      mockGetRequestHeader.mockReturnValue('wrong-token-abc')

      const handler = validateCsrfToken()

      await expect(handler(makeEvent('POST'))).rejects.toThrow(
        'Invalid CSRF token',
      )
      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 403,
        statusMessage: 'Invalid CSRF token',
      })
    })

    it('POST with session + missing header returns 403', async () => {
      mockGetSession.mockResolvedValue({ csrfToken: 'real-token-xyz' })
      mockGetRequestHeader.mockReturnValue(undefined)

      const handler = validateCsrfToken()

      await expect(handler(makeEvent('POST'))).rejects.toThrow(
        'Invalid CSRF token',
      )
      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 403,
        statusMessage: 'Invalid CSRF token',
      })
    })
  })
})
