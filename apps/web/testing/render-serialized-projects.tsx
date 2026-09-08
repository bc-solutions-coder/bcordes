import { runInNewContext } from 'node:vm'
import { render } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { attachRouterServerSsrUtils } from '@tanstack/react-router/ssr/server'
import { hydrate } from '@tanstack/react-router/ssr/client'
import { vi } from 'vitest'
import { ProjectCard } from '../src/features/projects'
import type { ShowcaseMeta } from '../src/features/projects'

export async function renderSerializedProjects(
  load: () => Array<ShowcaseMeta>,
) {
  function makeRouter(isServer: boolean, loader: () => Array<ShowcaseMeta>) {
    const root = createRootRoute()
    const page = createRoute({
      getParentRoute: () => root,
      path: '/',
      loader: () => ({ showcases: loader() }),
      component: () => (
        <>
          {page.useLoaderData().showcases.map((project) => (
            <ProjectCard key={project.slug} showcase={project} />
          ))}
        </>
      ),
    })
    return createRouter({
      routeTree: root.addChildren([page]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
      isServer,
      defaultStaleTime: Infinity,
    })
  }
  const server = makeRouter(true, load)
  attachRouterServerSsrUtils({ router: server, manifest: undefined })
  await server.load()
  if (!server.serverSsr) throw new Error('Server serialization is unavailable')
  await server.serverSsr.dehydrate()
  const script = server.serverSsr.takeBufferedScripts()?.children
  if (typeof script !== 'string')
    throw new Error('No serialized router payload')
  const bootstrap: {
    self?: unknown
    $_TSR?: Window['$_TSR']
    document: Pick<Document, 'currentScript'>
  } = { document: { currentScript: document.createElement('script') } }
  bootstrap.self = bootstrap
  runInNewContext(script, bootstrap)
  vi.stubGlobal('$_TSR', bootstrap.$_TSR)
  const client = makeRouter(false, () => {
    throw new Error('Hydrated catalog must not refetch')
  })
  await hydrate(client)
  return render(<RouterProvider router={client} />)
}
