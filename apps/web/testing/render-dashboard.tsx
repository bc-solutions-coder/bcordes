import { render } from '@testing-library/react'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { Provider, getContext } from '@bcordes/query'
import { Toaster } from 'sonner'
import { Route as Inquiries } from '../src/routes/dashboard/inquiries'
import { Route as InquiryList } from '../src/routes/dashboard/inquiries.index'
import { Route as InquiryDetail } from '../src/routes/dashboard/inquiries.$id'
import { Route as Settings } from '../src/routes/dashboard/settings'
import { Route as SettingsIndex } from '../src/routes/dashboard/settings.index'
import { backend } from './dashboard-backend'
import type { AnyRoute } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { EventStreamProvider } from '@/features/notifications'

export async function renderDashboard(
  path = '/dashboard/inquiries',
  prepare?: (client: QueryClient) => void,
) {
  const root = createRootRoute({
    component: Outlet,
    notFoundComponent: () => <p>Outside the dashboard</p>,
  })
  function attach(route: AnyRoute, parent: AnyRoute, routePath: string) {
    const options = {
      ...route.options,
      getParentRoute: () => parent,
      path: routePath,
    }
    return route.update(options)
  }
  attach(Inquiries, root, '/dashboard/inquiries')
  attach(InquiryList, Inquiries, '/')
  attach(InquiryDetail, Inquiries, '$id')
  attach(Settings, root, '/dashboard/settings')
  attach(SettingsIndex, Settings, '/')
  const context = getContext()
  context.queryClient.setDefaultOptions({ queries: { retry: false } })
  context.queryClient.setQueryData(
    ['auth', 'user'],
    backend.signedIn ? backend.user : null,
  )
  prepare?.(context.queryClient)
  const router = createRouter({
    routeTree: root.addChildren([
      Inquiries.addChildren([InquiryList, InquiryDetail]),
      Settings.addChildren([SettingsIndex]),
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
    context,
    Wrap: ({ children }) => (
      <Provider {...context}>
        <EventStreamProvider>{children}</EventStreamProvider>
        <Toaster />
      </Provider>
    ),
  })
  await router.load()
  return { router, ...context, ...render(<RouterProvider router={router} />) }
}
