'use client'

import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'

import { MobileNav } from './MobileNav'
import { UserMenu } from './UserMenu'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'


const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
  { href: '/resume', label: 'Resume' },
] as const

export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-border-default bg-white/80 backdrop-blur transition-shadow ${
        scrolled ? 'shadow-md' : ''
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center transition-opacity hover:opacity-80"
        >
          <img
            src="/BC-Solutions-no-background.svg"
            alt="BC Solutions"
            className="h-12"
          />
          <span className="ml-2 text-2xl font-bold tracking-tight text-text-primary">
            BC <span className="text-accent-secondary">Solutions</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex" viewport={false}>
          <NavigationMenuList className="gap-1">
            {navLinks.map((link) => (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink asChild>
                  <Link
                    to={link.href}
                    className={navigationMenuTriggerStyle()}
                    activeProps={{
                      className: `${navigationMenuTriggerStyle()} text-accent-primary`,
                    }}
                  >
                    <span className="text-text-primary hover:text-accent-primary transition-colors">
                      {link.label}
                    </span>
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* CTA Button, User Menu, and Mobile Nav */}
        <div className="flex items-center gap-2">
          <Button
            asChild
            className="hidden md:inline-flex bg-accent-primary hover:bg-accent-tertiary text-white font-medium"
          >
            <Link to="/contact">Get in Touch</Link>
          </Button>
          <UserMenu />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}

export default Header
