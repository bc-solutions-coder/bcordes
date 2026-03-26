import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Mail, RefreshCw } from 'lucide-react'
import { fetchCurrentUserRoles, serverRequireAuth } from '@/server-fns/auth'
import { fetchMyInquiries, updateInquiryStatus } from '@/server-fns/inquiries'
import { useEventStreamEvents } from '@/hooks/useEventStreamEvents'
import { formatDateTime } from '@/lib/format'
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
import { STATUS_COLORS, STATUS_LABELS } from '@/config/inquiries'

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

const projectTypeLabels: Record<string, string> = {
  frontend: 'Frontend Development',
  fullstack: 'Full-Stack Development',
  consulting: 'Consulting',
}

function DashboardInquiriesPage() {
  const { inquiries, isAdmin } = Route.useLoaderData()
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEventStreamEvents({
    InquirySubmitted: () => router.invalidate(),
    InquiryStatusUpdated: () => router.invalidate(),
  })

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-secondary">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Messages</h1>
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
            className="border-border text-foreground-secondary hover:text-foreground hover:bg-background"
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
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-secondary py-16">
            <Mail className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-lg font-medium text-foreground">
              No messages yet
            </h2>
            <p className="text-foreground-secondary">
              {isAdmin
                ? 'Contact form submissions will appear here.'
                : 'Inquiries you submit will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-secondary">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">
                    Company
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Project Type
                  </TableHead>
                  <TableHead className="text-muted-foreground">
                    Budget
                  </TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((inquiry) => (
                  <TableRow
                    key={inquiry.id}
                    className="cursor-pointer border-border transition-colors hover:bg-background/50"
                    onClick={() =>
                      router.navigate({
                        to: '/dashboard/inquiries/$id',
                        params: { id: inquiry.id },
                      })
                    }
                  >
                    <TableCell className="font-medium text-foreground">
                      {inquiry.name}
                    </TableCell>
                    <TableCell className="text-foreground-secondary">
                      {inquiry.email}
                    </TableCell>
                    <TableCell className="text-foreground-secondary">
                      {inquiry.company || '-'}
                    </TableCell>
                    <TableCell className="text-foreground-secondary">
                      {inquiry.projectType
                        ? (projectTypeLabels[inquiry.projectType] ??
                          inquiry.projectType)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-foreground-secondary">
                      {inquiry.budgetRange || '-'}
                    </TableCell>
                    <TableCell className="text-foreground-secondary whitespace-nowrap">
                      {formatDateTime(inquiry.createdAt)}
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
                            className={`w-32 border ${STATUS_COLORS[inquiry.status] ?? 'bg-gray-500/10 text-gray-500 border-gray-500/20'} bg-transparent`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-secondary border-border">
                            <SelectItem value="new" className="text-foreground">
                              New
                            </SelectItem>
                            <SelectItem
                              value="reviewed"
                              className="text-foreground"
                            >
                              Reviewed
                            </SelectItem>
                            <SelectItem
                              value="contacted"
                              className="text-foreground"
                            >
                              Contacted
                            </SelectItem>
                            <SelectItem
                              value="closed"
                              className="text-foreground"
                            >
                              Closed
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          className={`border ${STATUS_COLORS[inquiry.status] ?? 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}
                        >
                          {STATUS_LABELS[inquiry.status] ??
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
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {inquiries.length} message
            {inquiries.length !== 1 ? 's' : ''}
          </div>
        )}
      </main>
    </div>
  )
}
