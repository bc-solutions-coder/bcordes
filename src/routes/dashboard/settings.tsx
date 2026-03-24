import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/settings')({
  component: () => <Outlet />,
})
