import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft, MessageSquare, Send } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { fetchCurrentUserRoles, serverRequireAuth } from '@/server-fns/auth'
import {
  fetchInquiry,
  fetchInquiryComments,
  submitInquiryComment,
} from '@/server-fns/inquiries'
import { useEventStreamEvents } from '@/hooks/useEventStreamEvents'
import { Badge } from '@/components/ui/shadcn/badge'
import { Button } from '@/components/ui/shadcn/button'
import { Textarea } from '@/components/ui/shadcn/textarea'
import { Checkbox } from '@/components/ui/shadcn/checkbox'

export const Route = createFileRoute('/dashboard/inquiries/$id')({
  beforeLoad: () =>
    serverRequireAuth({ data: { returnTo: '/dashboard/inquiries' } }),
  loader: async ({ params }) => {
    const [inquiry, comments, currentUser] = await Promise.all([
      fetchInquiry({ data: { id: params.id } }),
      fetchInquiryComments({ data: { id: params.id } }),
      fetchCurrentUserRoles(),
    ])
    const isAdmin = currentUser.roles.includes('admin')
    return { inquiry, comments, isAdmin }
  },
  component: InquiryDetailPage,
  errorComponent: () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-8xl font-bold text-primary">404</h1>
      <h2 className="mb-4 text-2xl font-semibold text-foreground">
        Inquiry Not Found
      </h2>
      <p className="mb-8 max-w-md text-foreground-secondary">
        This inquiry doesn't exist or you don't have permission to view it.
      </p>
      <Link
        to="/dashboard/inquiries"
        className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-hover"
      >
        Back to Inquiries
      </Link>
    </div>
  ),
})

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  open: 'bg-green-500/10 text-green-500 border-green-500/20',
  in_progress: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  resolved: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  closed: 'bg-red-500/10 text-red-500 border-red-500/20',
}

function InquiryDetailPage() {
  const { inquiry, comments, isAdmin } = Route.useLoaderData()
  const router = useRouter()
  const [commentText, setCommentText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEventStreamEvents({
    InquiryStatusUpdated: () => router.invalidate(),
    InquiryCommentAdded: () => router.invalidate(),
  })
  const visibleComments = isAdmin
    ? comments
    : comments.filter((c) => !c.isInternal)

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <Link
            to="/dashboard/inquiries"
            className="mb-4 inline-flex items-center gap-1 text-sm text-foreground-secondary transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to inquiries
          </Link>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Inquiry Details
            </h1>
            <Badge
              className={`border ${statusColors[inquiry.status] ?? 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}
            >
              {inquiry.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Inquiry details */}
        <div className="rounded-lg border border-border bg-secondary p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Name
              </dt>
              <dd className="mt-1 text-foreground">{inquiry.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Email
              </dt>
              <dd className="mt-1 text-foreground">{inquiry.email}</dd>
            </div>
            {inquiry.company && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Company
                </dt>
                <dd className="mt-1 text-foreground">{inquiry.company}</dd>
              </div>
            )}
            {inquiry.projectType && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Project Type
                </dt>
                <dd className="mt-1 text-foreground">{inquiry.projectType}</dd>
              </div>
            )}
            {inquiry.budgetRange && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Budget
                </dt>
                <dd className="mt-1 text-foreground">{inquiry.budgetRange}</dd>
              </div>
            )}
            {inquiry.timeline && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Timeline
                </dt>
                <dd className="mt-1 text-foreground">{inquiry.timeline}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Submitted
              </dt>
              <dd className="mt-1 text-foreground">
                {formatDateTime(inquiry.createdAt)}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-border pt-6">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Message
            </h2>
            <p className="whitespace-pre-wrap text-foreground">
              {inquiry.message}
            </p>
          </div>
        </div>

        {/* Comments */}
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
            <MessageSquare className="h-5 w-5" />
            Comments
          </h2>
          {visibleComments.length === 0 ? (
            <p className="text-foreground-secondary">No comments yet.</p>
          ) : (
            <div className="space-y-4">
              {visibleComments.map((comment) => (
                <div
                  key={comment.id}
                  className={`rounded-lg border p-4 ${
                    comment.isInternal
                      ? 'border-yellow-500/20 bg-yellow-500/5'
                      : 'border-border bg-secondary'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {comment.authorName}
                    </span>
                    <div className="flex items-center gap-2">
                      {comment.isInternal && (
                        <Badge className="border border-yellow-500/20 bg-yellow-500/10 text-yellow-500">
                          Internal
                        </Badge>
                      )}
                      <span className="text-muted-foreground">
                        {formatDateTime(comment.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-foreground-secondary">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Comment Form */}
          <form
            className="mt-6"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!commentText.trim()) return
              setIsSubmitting(true)
              try {
                await submitInquiryComment({
                  data: {
                    id: inquiry.id,
                    content: commentText.trim(),
                    isInternal,
                  },
                })
                setCommentText('')
                setIsInternal(false)
                router.invalidate()
              } catch (error) {
                console.error('Failed to submit comment:', error)
              } finally {
                setIsSubmitting(false)
              }
            }}
          >
            <Textarea
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[100px] border-border bg-secondary text-foreground placeholder:text-muted-foreground"
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <Checkbox
                      id="internal"
                      checked={isInternal}
                      onCheckedChange={(checked) =>
                        setIsInternal(checked === true)
                      }
                    />
                    <label
                      htmlFor="internal"
                      className="text-sm text-foreground-secondary cursor-pointer select-none"
                    >
                      Internal note (not visible to submitter)
                    </label>
                  </>
                )}
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || !commentText.trim()}
                className="bg-primary hover:bg-primary-hover text-white"
              >
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
