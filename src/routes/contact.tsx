import { createFileRoute } from '@tanstack/react-router'
import { Github, Linkedin, Mail, MapPin } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FadeInView } from '~/components/shared/FadeInView'
import { ContactForm } from '~/components/contact/ContactForm'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
})

interface ContactInfoItem {
  icon: LucideIcon
  label: string
  value: string
  href: string | null
}

const contactInfo: Array<ContactInfoItem> = [
  {
    icon: Mail,
    label: 'Email',
    value: 'BC@bcordes.dev',
    href: 'mailto:BC@bcordes.dev',
  },
  {
    icon: Linkedin,
    label: 'LinkedIn',
    value: 'linkedin.com/in/bryancordes',
    href: 'https://linkedin.com/in/bryancordes',
  },
  {
    icon: Github,
    label: 'GitHub',
    value: 'github.com/BC-Solutions-Coder',
    href: 'https://github.com/BC-Solutions-Coder',
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Remote / US-based',
    href: null,
  },
]

function ContactPage() {
  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <section className="border-b border-border-default bg-background-secondary">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <FadeInView>
            <h1 className="mb-4 text-4xl font-bold text-text-primary md:text-5xl">
              Get in Touch
            </h1>
            <p className="max-w-2xl text-lg text-text-secondary">
              Have a project in mind? Let's discuss how I can help bring your
              ideas to life. Fill out the form below or reach out directly.
            </p>
          </FadeInView>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* Contact Info */}
          <FadeInView delay={100}>
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text-primary">
                Contact Information
              </h2>
              <div className="space-y-4">
                {contactInfo.map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent-primary/10">
                      <item.icon className="h-5 w-5 text-accent-secondary" />
                    </div>
                    <div>
                      <p className="text-sm text-text-tertiary">{item.label}</p>
                      {item.href ? (
                        <a
                          href={item.href}
                          target={
                            item.href.startsWith('http') ? '_blank' : undefined
                          }
                          rel={
                            item.href.startsWith('http')
                              ? 'noopener noreferrer'
                              : undefined
                          }
                          className="text-text-primary hover:text-accent-secondary transition-colors"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-text-primary">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Availability */}
              <div className="rounded-lg border border-border-default bg-background-secondary p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-secondary opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-accent-secondary" />
                  </span>
                  <span className="font-medium text-text-primary">
                    Available for projects
                  </span>
                </div>
                <p className="text-sm text-text-secondary">
                  Currently accepting new clients for Q1 2026.
                </p>
              </div>
            </div>
          </FadeInView>

          {/* Contact Form */}
          <FadeInView delay={200} className="lg:col-span-2">
            <div className="rounded-xl border border-border-default bg-background-secondary p-6 md:p-8">
              <h2 className="mb-6 text-xl font-semibold text-text-primary">
                Send a Message
              </h2>
              <ContactForm />
            </div>
          </FadeInView>
        </div>
      </div>
    </div>
  )
}
