'use client'

import { Link } from '@tanstack/react-router'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { useState } from 'react'

import { MobileNav as MobileNavShell } from '@bcordes/navigation'
import { Button } from '@bcordes/ui/components/button'
import { NAV_LINKS } from '../../config/navigation'
import { useUser } from '@/shared/auth'

const NAV_ITEMS = NAV_LINKS.map((link) => ({
  label: link.label,
  to: link.href,
}))

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const { user } = useUser()
  const isAdmin = user?.roles.includes('admin') ?? false

  const close = () => setOpen(false)

  return (
    <MobileNavShell
      items={NAV_ITEMS}
      open={open}
      onOpenChange={setOpen}
      onNavigate={close}
      actions={
        <>
          {!isAdmin && (
            <Button
              render={<Link to="/contact" onClick={close} />}
              nativeButton={false}
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium"
            >
              Get in Touch
            </Button>
          )}
          {user ? (
            <>
              <Link
                to="/dashboard/inquiries"
                onClick={close}
                className="flex items-center gap-2 px-4 py-3 text-lg font-medium text-foreground-secondary hover:text-primary hover:bg-secondary rounded-md transition-colors"
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Link>
              <button
                onClick={() => {
                  close()
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
              render={<a href="/auth/login" onClick={close} />}
              nativeButton={false}
              variant="outline"
              className="w-full border-border text-foreground-secondary hover:text-primary"
            >
              Sign In
            </Button>
          )}
        </>
      }
    />
  )
}
