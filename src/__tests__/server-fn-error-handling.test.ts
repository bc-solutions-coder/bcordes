import { describe, it, expect } from 'vitest'
import { WallowError } from '@/lib/wallow/errors'

describe('WallowError user-facing messages', () => {
  it('should produce a user-friendly message for 403 errors', () => {
    const error = new WallowError({
      type: 'https://httpstatuses.com/403',
      title: 'Forbidden',
      status: 403,
      detail: 'User does not have access to this resource',
      traceId: 'abc-123',
      code: 'FORBIDDEN',
    })
    const json = error.toJSON()
    expect(Object.keys(json)).not.toContain('traceId')
    expect(error.status).toBe(403)
  })

  it('should produce a user-friendly message for 404 errors', () => {
    const error = new WallowError({
      type: 'https://httpstatuses.com/404',
      title: 'Not Found',
      status: 404,
      detail: 'Resource not found',
      traceId: 'abc-456',
      code: 'NOT_FOUND',
    })
    const json = error.toJSON()
    expect(Object.keys(json)).not.toContain('traceId')
    expect(error.status).toBe(404)
  })
})
