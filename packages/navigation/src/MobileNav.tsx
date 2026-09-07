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
  readonly items: ReadonlyArray<NavItem>
  /** Rendered between the sheet heading and links. */
  readonly logo?: ReactNode
  /** Rendered after the links inside the sheet. */
  readonly actions?: ReactNode
  /** Sheet heading text; defaults to "Navigation". */
  readonly title?: ReactNode
  /** aria-label for the hamburger trigger; defaults to "Open navigation menu". */
  readonly triggerLabel?: string
  /** Controlled open state of the sheet. */
  readonly open?: boolean
  /** Initial open state when uncontrolled. */
  readonly defaultOpen?: boolean
  readonly onOpenChange?: (open: boolean) => void
  /** Called when a nav link is activated; the caller handles closing the sheet. */
  readonly onNavigate?: () => void
}

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
