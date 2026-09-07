'use client'

import { logout } from '@bc-solutions-coder/sdk'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import { LayoutDashboard, LogOut } from 'lucide-react'

import { Avatar, AvatarFallback } from '@bcordes/ui/components/avatar'
import { Button } from '@bcordes/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@bcordes/ui/components/dropdown-menu'
import { useUser } from '@/shared/auth'

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
        render={<a href="/bff/login" />}
        nativeButton={false}
        variant="ghost"
        className="hidden md:inline-flex text-foreground-secondary hover:text-primary"
      >
        Sign In
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="hidden md:inline-flex items-center gap-2 text-foreground-secondary hover:text-primary"
          />
        }
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          render={<Link to="/dashboard/inquiries" className="cursor-pointer" />}
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <a
              href="/bff/logout"
              className="cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                // POST to logout endpoint
                void logout().catch(() =>
                  toast.error('Unable to sign out. Please try again.'),
                )
              }}
            />
          }
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
