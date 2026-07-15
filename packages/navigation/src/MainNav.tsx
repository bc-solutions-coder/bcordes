'use client'

import { Link } from '@tanstack/react-router'

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@bcordes/ui/components/navigation-menu'
import type { ReactElement, ReactNode } from 'react'

import type { NavItem } from './types'

export interface MainNavProps {
  /** Injected navigation entries — the shell hard-codes none of its own. */
  readonly items: ReadonlyArray<NavItem>
  /** App-supplied branding/logo slot rendered at the start of the bar. */
  readonly logo?: ReactNode
  /** App-supplied trailing slot (CTA, notification bell, user menu, etc.). */
  readonly actions?: ReactNode
  readonly className?: string
}

/**
 * Parameterized desktop navigation bar. It renders the row chrome (logo slot,
 * horizontal nav, actions slot) but hard-codes no routes, no branding, and has
 * no product/auth coupling — the consuming app injects everything through
 * props. Active-item highlighting is delegated to TanStack Router's built-in
 * `<Link activeProps>` / `activeOptions`, keyed off each item's `exact` flag.
 */
export function MainNav({
  items,
  logo,
  actions,
  className,
}: MainNavProps): ReactElement {
  return (
    <div
      className={`container mx-auto flex h-16 items-center justify-between px-4 md:px-6${
        className ? ` ${className}` : ''
      }`}
    >
      {logo}

      <NavigationMenu className="hidden md:flex" viewport={false}>
        <NavigationMenuList className="gap-1">
          {items.map((item) => (
            <NavigationMenuItem key={item.to}>
              <NavigationMenuLink
                render={
                  <Link
                    to={item.to}
                    activeOptions={{ exact: item.exact }}
                    className={navigationMenuTriggerStyle()}
                    activeProps={{
                      className: `${navigationMenuTriggerStyle()} text-primary`,
                    }}
                  />
                }
              >
                <span className="text-foreground hover:text-primary transition-colors">
                  {item.label}
                </span>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      {actions != null && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
