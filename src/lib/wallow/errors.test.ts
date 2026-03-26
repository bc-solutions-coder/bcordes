import { describe, expect, it } from 'vitest'
import { WallowError, isWallowError } from './errors'
import type { ProblemDetails } from './types'

const baseProblem: ProblemDetails = {
  type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
  title: 'Bad Request',
  status: 400,
  detail: 'Something went wrong',
  traceId: '00-abc-def-01',
  code: 'GENERIC_ERROR',
}

describe('WallowError', () => {
  describe('message', () => {
    it('uses detail as message when present', () => {
      const error = new WallowError({
        ...baseProblem,
        detail: 'Detailed explanation',
        title: 'Short Title',
      })
      expect(error.message).toBe('Detailed explanation')
    })

    it('falls back to title when detail is absent', () => {
      const { detail: _, ...withoutDetail } = baseProblem
      const error = new WallowError({
        ...withoutDetail,
        title: 'Fallback Title',
      } as ProblemDetails)
      expect(error.message).toBe('Fallback Title')
    })
  })

  describe('properties', () => {
    it('exposes status from ProblemDetails', () => {
      const error = new WallowError({ ...baseProblem, status: 503 })
      expect(error.status).toBe(503)
    })

    it('exposes code from ProblemDetails', () => {
      const error = new WallowError({ ...baseProblem, code: 'RATE_LIMITED' })
      expect(error.code).toBe('RATE_LIMITED')
    })

    it('exposes traceId from ProblemDetails', () => {
      const error = new WallowError({
        ...baseProblem,
        traceId: '00-trace-123-01',
      })
      expect(error.traceId).toBe('00-trace-123-01')
    })

    it('sets name to "WallowError"', () => {
      const error = new WallowError(baseProblem)
      expect(error.name).toBe('WallowError')
    })
  })

  describe('boolean status flags', () => {
    it('isValidation is true for status 400 with validation errors', () => {
      const error = new WallowError({
        ...baseProblem,
        status: 400,
        errors: { field: ['required'] },
      })
      expect(error.isValidation).toBe(true)
    })

    it('isValidation is false for status 400 without validation errors', () => {
      const error = new WallowError({ ...baseProblem, status: 400 })
      expect(error.isValidation).toBe(false)
    })

    it('isValidation is false for status 422', () => {
      const error = new WallowError({
        ...baseProblem,
        status: 422,
        errors: { field: ['invalid'] },
      })
      expect(error.isValidation).toBe(false)
    })

    it('isNotFound is true for status 404', () => {
      const error = new WallowError({ ...baseProblem, status: 404 })
      expect(error.isNotFound).toBe(true)
    })

    it('isNotFound is false for other statuses', () => {
      const error = new WallowError({ ...baseProblem, status: 500 })
      expect(error.isNotFound).toBe(false)
    })

    it('isForbidden is true for status 403', () => {
      const error = new WallowError({ ...baseProblem, status: 403 })
      expect(error.isForbidden).toBe(true)
    })

    it('isForbidden is false for other statuses', () => {
      const error = new WallowError({ ...baseProblem, status: 401 })
      expect(error.isForbidden).toBe(false)
    })

    it('isUnauthorized is true for status 401', () => {
      const error = new WallowError({ ...baseProblem, status: 401 })
      expect(error.isUnauthorized).toBe(true)
    })

    it('isUnauthorized is false for other statuses', () => {
      const error = new WallowError({ ...baseProblem, status: 403 })
      expect(error.isUnauthorized).toBe(false)
    })
  })
})

describe('isWallowError', () => {
  it('returns true for WallowError instances', () => {
    const error = new WallowError(baseProblem)
    expect(isWallowError(error)).toBe(true)
  })

  it('returns false for plain Error objects', () => {
    expect(isWallowError(new Error('plain'))).toBe(false)
  })

  it('returns false for non-error values', () => {
    expect(isWallowError(null)).toBe(false)
    expect(isWallowError(undefined)).toBe(false)
    expect(isWallowError('string')).toBe(false)
    expect(isWallowError(42)).toBe(false)
    expect(isWallowError({ status: 400 })).toBe(false)
  })
})
