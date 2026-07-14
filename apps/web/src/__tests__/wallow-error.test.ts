import { describe, expect, it } from 'vitest'
import type { ProblemDetails } from '@/lib/wallow/types'
import { WallowError } from '@/lib/wallow/errors'

describe('WallowError.toJSON()', () => {
  const validationProblem: ProblemDetails = {
    type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
    title: 'Validation Error',
    status: 400,
    detail: 'Internal: field "email" failed regex at rule engine v3.2',
    traceId: '00-abc123def456-789xyz-01',
    code: 'VALIDATION_ERROR',
    errors: {
      email: ['Email address is invalid'],
      name: ['Name is required'],
    },
  }

  const notFoundProblem: ProblemDetails = {
    type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
    title: 'Not Found',
    status: 404,
    detail: 'Inquiry with id 42 was not found',
    traceId: '00-trace999-span888-01',
    code: 'INQUIRY_NOT_FOUND',
  }

  const forbiddenProblem: ProblemDetails = {
    type: 'https://tools.ietf.org/html/rfc7231#section-6.5.3',
    title: 'Forbidden',
    status: 403,
    detail: 'You do not have permission to access this resource',
    traceId: '00-secretTrace-shouldNotLeak-01',
    code: 'ACCESS_DENIED',
  }

  it('should not contain traceId in JSON.stringify output for validation errors', () => {
    const error = new WallowError(validationProblem)
    const serialized = JSON.stringify(error)

    expect(serialized).not.toContain('00-abc123def456-789xyz-01')
    expect(serialized).not.toContain('traceId')
  })

  it('should not contain traceId in JSON.stringify output for non-validation errors', () => {
    const error = new WallowError(notFoundProblem)
    const serialized = JSON.stringify(error)

    expect(serialized).not.toContain('00-trace999-span888-01')
    expect(serialized).not.toContain('traceId')
  })

  it('should show generic "Validation failed" message for validation errors, not internal detail', () => {
    const error = new WallowError(validationProblem)
    const serialized = JSON.stringify(error)
    const parsed = JSON.parse(serialized)

    expect(parsed.message).toBe('Validation failed')
    expect(serialized).not.toContain(
      'Internal: field "email" failed regex at rule engine v3.2',
    )
  })

  it('should preserve the original message for non-validation errors', () => {
    const error = new WallowError(notFoundProblem)
    const serialized = JSON.stringify(error)
    const parsed = JSON.parse(serialized)

    expect(parsed.message).toBe('Inquiry with id 42 was not found')
  })

  it('should include status and code in serialized output', () => {
    const error = new WallowError(notFoundProblem)
    const serialized = JSON.stringify(error)
    const parsed = JSON.parse(serialized)

    expect(parsed.status).toBe(404)
    expect(parsed.code).toBe('INQUIRY_NOT_FOUND')
  })

  it('should include validation errors in serialized output for validation errors', () => {
    const error = new WallowError(validationProblem)
    const serialized = JSON.stringify(error)
    const parsed = JSON.parse(serialized)

    expect(parsed.validationErrors).toEqual({
      email: ['Email address is invalid'],
      name: ['Name is required'],
    })
  })

  it('should strip traceId even for forbidden errors', () => {
    const error = new WallowError(forbiddenProblem)
    const serialized = JSON.stringify(error)

    expect(serialized).not.toContain('00-secretTrace-shouldNotLeak-01')
    expect(serialized).not.toContain('traceId')
  })
})
