import { Github, Linkedin, Mail } from 'lucide-react'

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
  { href: '/resume', label: 'Resume' },
] as const

export const SOCIAL_LINKS = [
  {
    label: 'GitHub',
    href: 'https://github.com/BC-Solutions-Coder',
    icon: Github,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/bryancordes',
    icon: Linkedin,
  },
  {
    label: 'Email',
    href: 'mailto:BC@bcordes.dev',
    icon: Mail,
  },
] as const
