import { useEffect, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { serverRequireAuth } from '@/server-fns/auth'
import { fetchMyInquiries, updateInquiryStatus } from '@/server-fns/inquiries'
import { getAuthUser } from '@/lib/auth/middleware'
import { useSignalR } from '@/hooks/useSignalR'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mail, RefreshCw } from 'lucide-react'

const fetchCurrentUserRoles = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getAuthUser()
    return { roles: user?.roles ?? [] }
  },
)

export const Route = createFileRoute('/dashboard/inquiries/')({
  beforeLoad: () =>
    serverRequireAuth({ data: { returnTo: '/dashboard/inquiries' } }),
  loader: async () => {
    const [inquiries, currentUser] = await Promise.all([
      fetchMyInquiries(),
      fetchCurrentUserRoles(),
    ])
    const isAdmin = currentUser.roles.includes('admin')
    return { inquiries, isAdmin }
  },
  component: DashboardInquiriesPage,
})

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  open: 'bg-green-500/10 text-green-500 border-green-500/20',
  in_progress: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  resolved: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  closed: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const statusLabels: Record<string, string> = {
  new: 'New',
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

const projectTypeLabels: Record<string, string> = {
  frontend: 'Frontend Development',
  fullstack: 'Full-Stack Development',
  consulting: 'Consulting',
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DashboardInquiriesPage() {
  const { inquiries, isAdmin } = Route.useLoaderData()
  const router = useRouter()
  const { subscribe } = useSignalR()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const unsubs = [
      subscribe('InquirySubmitted', () => router.invalidate()),
      subscribe('InquiryStatusUpdated', () => router.invalidate()),
    ]
    return () => unsubs.forEach((unsub) => unsub())
  }, [subscribe, router])

  async function handleRefresh() {
    setIsRefreshing(true)
    try {
      await router.invalidate()
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await updateInquiryStatus({ data: { id, status } })
      router.invalidate()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const newCount = inquiries.filter((c) => c.status === 'new').length

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="border-b border-border-default bg-background-secondary">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-accent-secondary" />
            <h1 className="text-xl font-semibold text-text-primary">
              Messages
            </h1>
            {newCount > 0 && (
              <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                {newCount} new
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-border-default text-text-secondary hover:text-text-primary hover:bg-background-primary"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {inquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border-default bg-background-secondary py-16">
            <Mail className="mb-4 h-12 w-12 text-text-tertiary" />
            <h2 className="mb-2 text-lg font-medium text-text-primary">
              No messages yet
            </h2>
            <p className="text-text-secondary">
              {isAdmin
                ? 'Contact form submissions will appear here.'
                : 'Inquiries you submit will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-default bg-background-secondary">
            <Table>
              <TableHeader>
                <TableRow className="border-border-default hover:bg-transparent">
                  <TableHead className="text-text-tertiary">Name</TableHead>
                  <TableHead className="text-text-tertiary">Email</TableHead>
                  <TableHead className="text-text-tertiary">Company</TableHead>
                  <TableHead className="text-text-tertiary">
                    Project Type
                  </TableHead>
                  <TableHead className="text-text-tertiary">Budget</TableHead>
                  <TableHead className="text-text-tertiary">Date</TableHead>
                  <TableHead className="text-text-tertiary">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((inquiry) => (
                  <TableRow
                    key={inquiry.id}
                    className="cursor-pointer border-border-default transition-colors hover:bg-background-primary/50"
                    onClick={() =>
                      router.navigate({
                        to: '/dashboard/inquiries/$id',
                        params: { id: inquiry.id },
                      })
                    }
                  >
                    <TableCell className="font-medium text-text-primary">
                      {inquiry.name}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {inquiry.email}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {inquiry.company || '-'}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {inquiry.projectType
                        ? (projectTypeLabels[inquiry.projectType] ??
                          inquiry.projectType)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {inquiry.budgetRange || '-'}
                    </TableCell>
                    <TableCell className="text-text-secondary whitespace-nowrap">
                      {formatDate(inquiry.createdAt)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {isAdmin ? (
                        <Select
                          value={inquiry.status}
                          onValueChange={(value) =>
                            handleStatusChange(inquiry.id, value)
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            className={`w-32 border ${statusColors[inquiry.status] ?? 'bg-gray-500/10 text-gray-500 border-gray-500/20'} bg-transparent`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background-secondary border-border-default">
                            <SelectItem
                              value="new"
                              className="text-text-primary"
                            >
                              New
                            </SelectItem>
                            <SelectItem
                              value="open"
                              className="text-text-primary"
                            >
                              Open
                            </SelectItem>
                            <SelectItem
                              value="in_progress"
                              className="text-text-primary"
                            >
                              In Progress
                            </SelectItem>
                            <SelectItem
                              value="resolved"
                              className="text-text-primary"
                            >
                              Resolved
                            </SelectItem>
                            <SelectItem
                              value="closed"
                              className="text-text-primary"
                            >
                              Closed
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          className={`border ${statusColors[inquiry.status] ?? 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}
                        >
                          {statusLabels[inquiry.status] ??
                            inquiry.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary */}
        {inquiries.length > 0 && (
          <div className="mt-4 text-sm text-text-tertiary">
            Showing {inquiries.length} message
            {inquiries.length !== 1 ? 's' : ''}
          </div>
        )}
      </main>
    </div>
  )
}
