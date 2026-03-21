import { Link } from '@tanstack/react-router'
import { Github, Linkedin, Mail } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

const navigationLinks = [
  { name: 'Home', href: '/' },
  { name: 'Projects', href: '/projects' },
  { name: 'About', href: '/about' },
  { name: 'Resume', href: '/resume' },
]

const socialLinks = [
  {
    name: 'GitHub',
    href: 'https://github.com/BC-Solutions-Coder',
    icon: Github,
  },
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/in/bryancordes',
    icon: Linkedin,
  },
  {
    name: 'Email',
    href: 'mailto:BC@bcordes.dev',
    icon: Mail,
  },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#1a1a1a] border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {/* Three-column grid */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand Column */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <img src="/BC-Solutions-no-background.svg" alt="BC Solutions" className="h-14" />
              <span className="text-2xl font-bold tracking-tight text-white">
                BC <span className="text-[#a8e6a0]">Solutions</span>
              </span>
            </Link>
            <p className="text-sm text-white/70 leading-relaxed">
              Building exceptional digital experiences with modern web technologies.
            </p>
          </div>

          {/* Navigation Column */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">
              Navigation
            </h3>
            <ul className="space-y-3">
              {navigationLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-white/70 hover:text-[#a8e6a0] transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect Column */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">
              Connect
            </h3>
            <div className="flex gap-4">
              {socialLinks.map((link) => {
                const IconComponent = link.icon
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                    rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                    className="text-white/70 hover:text-[#a8e6a0] transition-colors duration-200"
                    aria-label={link.name}
                  >
                    <IconComponent className="h-5 w-5" />
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-white/10" />

        {/* Bottom Section */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-white/50">
            &copy; {currentYear} BC Solutions. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
