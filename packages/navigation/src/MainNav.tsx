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
  readonly items: ReadonlyArray<NavItem>
  /** Rendered before the navigation links. */
  readonly logo?: ReactNode
  /** Rendered after the navigation links. */
  readonly actions?: ReactNode
  readonly className?: string
}

/** Uses each item's exact flag for TanStack Router active-link matching. */
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
