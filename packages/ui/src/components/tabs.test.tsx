import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@bcordes/ui/components/tabs'

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

describe('Tabs', () => {
  it('names the tab list controls and their active panel', () => {
    renderTabs()
    expect(screen.getByRole('tablist')).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Account' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Password' })).toBeVisible()
    expect(screen.getByRole('tabpanel', { name: 'Account' })).toHaveTextContent(
      'Account panel',
    )
  })

  it('reports the selected tab and its unselected alternative', () => {
    renderTabs()
    expect(
      screen.getByRole('tab', { name: 'Account', selected: true }),
    ).toBeVisible()
    expect(
      screen.getByRole('tab', { name: 'Password', selected: false }),
    ).toBeVisible()
  })

  it('selects the activated tab and replaces the named panel', async () => {
    renderTabs()
    fireEvent.click(screen.getByRole('tab', { name: 'Password' }))
    expect(
      await screen.findByRole('tabpanel', { name: 'Password' }),
    ).toHaveTextContent('Password panel')
    expect(
      screen.getByRole('tab', { name: 'Password', selected: true }),
    ).toBeVisible()
    expect(
      screen.getByRole('tab', { name: 'Account', selected: false }),
    ).toBeVisible()
    expect(
      screen.queryByRole('tabpanel', { name: 'Account' }),
    ).not.toBeInTheDocument()
  })
})
