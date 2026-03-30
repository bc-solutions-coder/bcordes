'use client'

import { Link } from '@tanstack/react-router'
import { LayoutDashboard, LogOut, Menu } from 'lucide-react'
import { useState } from 'react'

import { NAV_LINKS } from '@/config/navigation'
import { Button } from '@/components/ui/shadcn/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/shadcn/sheet'
import { useUser } from '@/hooks/useUser'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const { user } = useUser()
  const isAdmin = user?.roles.includes('admin') ?? false

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-foreground hover:text-primary hover:bg-transparent"
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[300px] bg-background border-border"
      >
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-foreground text-left">
            Navigation
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2 pt-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setOpen(false)}
              className="flex items-center px-4 py-3 text-lg font-medium text-foreground-secondary hover:text-primary hover:bg-secondary rounded-md transition-colors"
              activeProps={{
                className:
                  'flex items-center px-4 py-3 text-lg font-medium text-primary bg-secondary rounded-md transition-colors',
              }}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-6 px-4 flex flex-col gap-3">
            {!isAdmin && (
              <Button
                asChild
                className="w-full bg-primary hover:bg-primary-hover text-white font-medium"
              >
                <Link to="/contact" onClick={() => setOpen(false)}>
                  Get in Touch
                </Link>
              </Button>
            )}
            {user ? (
              <>
                <Link
                  to="/dashboard/inquiries"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-lg font-medium text-foreground-secondary hover:text-primary hover:bg-secondary rounded-md transition-colors"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    setOpen(false)
                    const form = document.createElement('form')
                    form.method = 'POST'
                    form.action = '/auth/logout'
                    document.body.appendChild(form)
                    form.submit()
                  }}
                  className="flex items-center gap-2 px-4 py-3 text-lg font-medium text-foreground-secondary hover:text-primary hover:bg-secondary rounded-md transition-colors text-left"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </>
            ) : (
              <Button
                asChild
                variant="outline"
                className="w-full border-border text-foreground-secondary hover:text-primary"
              >
                <a href="/auth/login" onClick={() => setOpen(false)}>
                  Sign In
                </a>
              </Button>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
