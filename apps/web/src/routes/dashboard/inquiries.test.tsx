import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers/render'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    createFileRoute: () => (routeConfig: unknown) => routeConfig,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  }
})

// ---------------------------------------------------------------------------
// Import route module after mocks
// ---------------------------------------------------------------------------

const routeModule = await import('./inquiries')
const routeConfig = routeModule.Route as unknown as {
  component: React.ComponentType
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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
