import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid="outlet" />,
  createFileRoute: () => (config: Record<string, unknown>) => config,
}))

const routeModule = await import('./notifications')
const routeConfig = routeModule.Route as unknown as {
  component: React.ComponentType
}

describe('notifications layout route', () => {
  it('exports a route with a component', () => {
    expect(routeConfig.component).toBeDefined()
    expect(typeof routeConfig.component).toBe('function')
  })

  it('renders an Outlet', async () => {
    const { render, screen } = await import('@testing-library/react')
    const Component = routeConfig.component

    render(<Component />)

    expect(screen.getByTestId('outlet')).toBeTruthy()
  })
})
