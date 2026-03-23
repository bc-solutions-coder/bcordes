import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/inquiries')({
  component: () => <Outlet />,
})
