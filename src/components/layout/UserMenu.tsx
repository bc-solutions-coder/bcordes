'use client'

import { Link } from '@tanstack/react-router'
import { LayoutDashboard, LogOut } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar'
import { Button } from '@/components/ui/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu'
import { useUser } from '@/hooks/useUser'

function getInitials(name: string | undefined) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function UserMenu() {
  const { user, isLoading } = useUser()

  if (isLoading) return null

  if (!user) {
    return (
      <Button
        asChild
        variant="ghost"
        className="hidden md:inline-flex text-foreground-secondary hover:text-primary"
      >
        <a href="/auth/login">Sign In</a>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="hidden md:inline-flex items-center gap-2 text-foreground-secondary hover:text-primary"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary text-white text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[120px] truncate">
            {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive against runtime OIDC data */}
            {user.name ?? user.email ?? 'User'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to="/dashboard/inquiries" className="cursor-pointer">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a
            href="/auth/logout"
            className="cursor-pointer"
            onClick={(e) => {
              e.preventDefault()
              // POST to logout endpoint
              const form = document.createElement('form')
              form.method = 'POST'
              form.action = '/auth/logout'
              document.body.appendChild(form)
              form.submit()
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
