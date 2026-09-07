import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { renderWithProviders } from '@bcordes/test-utils'

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    createFileRoute: () => (routeConfig: unknown) => routeConfig,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  }
})

const routeModule = await import('./inquiries')
const routeConfig = routeModule.Route as unknown as {
  component: React.ComponentType
}

describe('inquiries layout route', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders an Outlet', () => {
    const Component = routeConfig.component
    renderWithProviders(<Component />)

    expect(screen.getByTestId('outlet')).toBeTruthy()
    expect(screen.getByText('Outlet Content')).toBeTruthy()
  })
})
