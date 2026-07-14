import { Link, createFileRoute, useSearch } from '@tanstack/react-router'

const errorMessages: Record<string, { title: string; description: string }> = {
  auth_failed: {
    title: 'Authentication Failed',
    description:
      'We couldn\u2019t complete the sign-in process. The authentication server may be temporarily unavailable.',
  },
  state_mismatch: {
    title: 'Security Check Failed',
    description:
      'The sign-in request couldn\u2019t be verified. This can happen if the request expired or was tampered with.',
  },
  missing_params: {
    title: 'Incomplete Response',
    description:
      'The authentication provider returned an incomplete response. Please try signing in again.',
  },
  too_many_redirects: {
    title: 'Too Many Redirects',
    description:
      'We detected a redirect loop during sign-in. This usually means a backend service is temporarily unavailable.',
  },
}

const defaultError = {
  title: 'Something Went Wrong',
  description:
    'An unexpected error occurred during authentication. Please try again in a moment.',
}

export const Route = createFileRoute('/auth/error')({
  validateSearch: (search: Record<string, unknown>) => ({
    reason: (search.reason as string) || 'unknown',
  }),
  component: AuthErrorPage,
})

function AuthErrorPage() {
  const { reason } = useSearch({ from: '/auth/error' })
  const error = errorMessages[reason] as
    | (typeof errorMessages)[string]
    | undefined
  const { title, description } = error ?? defaultError

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-10 w-10 text-destructive"
        >
          <circle cx={12} cy={12} r={10} />
          <line x1={12} y1={8} x2={12} y2={12} />
          <line x1={12} y1={16} x2={12.01} y2={16} />
        </svg>
      </div>
      <h1 className="mb-2 font-heading text-3xl font-bold text-foreground md:text-4xl">
        {title}
      </h1>
      <p className="mb-8 max-w-md text-foreground-secondary">{description}</p>
      <div className="flex gap-4">
        <Link
          to="/auth/login"
          className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Try Again
        </Link>
        <Link
          to="/"
          className="rounded-lg border border-border px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted"
        >
          Go Home
        </Link>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        If this keeps happening, please{' '}
        <Link
          to="/contact"
          className="text-primary underline hover:no-underline"
        >
          get in touch
        </Link>
        .
      </p>
    </div>
  )
}
