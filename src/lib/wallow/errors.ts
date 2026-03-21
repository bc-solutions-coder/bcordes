import type { ProblemDetails } from './types'

/** Custom error class representing an error response from the Wallow backend */
export class WallowError extends Error {
  /** HTTP status code from the problem details response */
  readonly status: number

  /** Application-specific error code */
  readonly code: string

  /** Distributed trace identifier for debugging */
  readonly traceId: string

  /** Field-level validation errors, present when status is 400 */
  readonly validationErrors: Record<string, string[]> | undefined

  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title)
    this.name = 'WallowError'
    this.status = problem.status
    this.code = problem.code
    this.traceId = problem.traceId
    this.validationErrors = problem.errors
  }

  /** True when this is a 400 validation error with field errors present */
  get isValidation(): boolean {
    return this.status === 400 && !!this.validationErrors
  }

  /** True when the resource was not found (404) */
  get isNotFound(): boolean {
    return this.status === 404
  }

  /** True when the caller lacks permission (403) */
  get isForbidden(): boolean {
    return this.status === 403
  }

  /** True when the caller is not authenticated (401) */
  get isUnauthorized(): boolean {
    return this.status === 401
  }
}

/** Type guard that checks whether an unknown value is a WallowError */
export function isWallowError(value: unknown): value is WallowError {
  return value instanceof WallowError
}
