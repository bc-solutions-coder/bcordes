'use client'

import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'

import { Button } from '@bcordes/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@bcordes/ui/components/sheet'
import type { ReactElement, ReactNode } from 'react'

import type { NavItem } from './types'

export interface MobileNavProps {
  /** Injected navigation entries — the shell hard-codes none of its own. */
  readonly items: ReadonlyArray<NavItem>
  /** App-supplied branding/logo slot. */
  readonly logo?: ReactNode
  /** App-supplied slot inside the sheet (auth-branch links, CTA, etc.). */
  readonly actions?: ReactNode
  /** Sheet heading text; defaults to "Navigation". */
  readonly title?: ReactNode
  /** aria-label for the hamburger trigger; defaults to "Open navigation menu". */
  readonly triggerLabel?: string
  /** Controlled open state of the sheet. */
  readonly open?: boolean
  /** Uncontrolled initial open state (used by tests to render the sheet open). */
  readonly defaultOpen?: boolean
  readonly onOpenChange?: (open: boolean) => void
  /** Called when any nav link is activated (app closes the sheet). */
  readonly onNavigate?: () => void
}

/**
 * Parameterized mobile navigation. It owns the hamburger trigger + Sheet chrome
 * and renders the injected items, plus optional `logo`/`actions` slots — but
 * hard-codes no routes, no branding, and has no product/auth coupling. Any
 * auth-branching (sign in/out, dashboard) is supplied by the app via `actions`.
 */
export function MobileNav({
  items,
  logo,
  actions,
  title = 'Navigation',
  triggerLabel = 'Open navigation menu',
  open,
  defaultOpen,
  onOpenChange,
  onNavigate,
}: MobileNavProps): ReactElement {
  return (
    <Sheet open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-foreground hover:text-primary hover:bg-transparent"
            aria-label={triggerLabel}
          />
        }
      >
        <Menu className="h-6 w-6" />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[300px] bg-background border-border"
      >
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-foreground text-left">{title}</SheetTitle>
        </SheetHeader>
        {logo != null && <div className="px-4 pt-4">{logo}</div>}
        <nav className="flex flex-col gap-2 pt-6">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              activeOptions={{ exact: item.exact }}
              className="flex items-center px-4 py-3 text-lg font-medium text-foreground-secondary hover:text-primary hover:bg-secondary rounded-md transition-colors"
              activeProps={{
                className:
                  'flex items-center px-4 py-3 text-lg font-medium text-primary bg-secondary rounded-md transition-colors',
              }}
            >
              {item.label}
            </Link>
          ))}
          {actions != null && (
            <div className="mt-6 px-4 flex flex-col gap-3">{actions}</div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
