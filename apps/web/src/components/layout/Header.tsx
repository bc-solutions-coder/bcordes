'use client'

import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'

import { MainNav } from '@bcordes/navigation'
import { Button } from '@bcordes/ui/components/button'
import { MobileNav } from './MobileNav'
import { UserMenu } from './UserMenu'
import { NotificationBell } from '@/features/notifications'
import { NAV_LINKS } from '@/config/navigation'
import { useUser } from '@/shared/auth'

const NAV_ITEMS = NAV_LINKS.map((link) => ({
  label: link.label,
  to: link.href,
}))

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const { user } = useUser()
  const isAdmin = user?.roles.includes('admin') ?? false

  useEffect(() => {
    const handleScroll = () => {
      setScrolled((prev) => {
        const next = window.scrollY > 0
        return prev === next ? prev : next
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur transition-shadow ${
        scrolled ? 'shadow-md' : ''
      }`}
    >
      <MainNav
        items={NAV_ITEMS}
        logo={
          <Link
            to="/"
            className="flex items-center transition-opacity hover:opacity-80"
          >
            <img
              src="/BC-Solutions-no-background.svg"
              alt="BC Solutions"
              width={48}
              height={48}
              className="h-12 w-12"
            />
            <span className="ml-2 text-2xl font-bold tracking-tight text-foreground">
              BC <span className="text-primary">Solutions</span>
            </span>
          </Link>
        }
        actions={
          <>
            {!isAdmin && (
              <Button
                render={<Link to="/contact" />}
                nativeButton={false}
                className="hidden md:inline-flex bg-primary hover:bg-primary-hover text-white font-medium"
              >
                Get in Touch
              </Button>
            )}
            <NotificationBell />
            <UserMenu />
            <MobileNav />
          </>
        }
      />
    </header>
  )
}

export default Header
