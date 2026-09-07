import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

function renderTabs(defaultValue = 'account') {
  return render(
    <Tabs defaultValue={defaultValue}>
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account panel</TabsContent>
      <TabsContent value="password">Password panel</TabsContent>
    </Tabs>,
  )
}

describe('Tabs (Radix -> Base UI migration contract)', () => {
  it('renders tab triggers and the active panel with their data-slots', () => {
    renderTabs()
    expect(document.querySelector('[data-slot="tabs-list"]')).not.toBeNull()
    const accountTab = screen.getByRole('tab', { name: 'Account' })
    expect(accountTab).toHaveAttribute('data-slot', 'tabs-trigger')
    const panel = screen.getByText('Account panel')
    expect(panel).toHaveAttribute('data-slot', 'tabs-content')
  })

  it('marks the active tab with the data-active attribute', () => {
    renderTabs()
    expect(screen.getByRole('tab', { name: 'Account' })).toHaveAttribute(
      'data-active',
    )
    expect(screen.getByRole('tab', { name: 'Password' })).not.toHaveAttribute(
      'data-active',
    )
  })

  it('activates a tab and shows its panel when clicked', async () => {
    renderTabs()
    expect(screen.queryByText('Password panel')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Password' }))
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Password' })).toHaveAttribute(
        'data-active',
      )
    })
    expect(screen.getByText('Password panel')).toBeInTheDocument()
    expect(screen.queryByText('Account panel')).toBeNull()
  })
})
