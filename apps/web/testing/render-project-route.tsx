import { Route as Detail } from '../src/routes/projects/$slug'
import { Route as Projects } from '../src/routes/projects/index'
import { renderFileRoute } from './render-file-route'

export function renderProjectRoute(initialPath = '/projects') {
  return renderFileRoute(Projects, '/projects', {
    initialPath,
    siblings: [{ route: Detail, path: '/projects/$slug' }],
  })
}
