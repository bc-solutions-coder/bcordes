import { createFileRoute } from '@tanstack/react-router'
import { AboutHero } from '~/components/about/AboutHero'
import { Timeline } from '~/components/about/Timeline'
import { FadeInView } from '~/components/shared/FadeInView'

export const Route = createFileRoute('/about')({ component: AboutPage })

function ValueIcon({ d }: { d: string }) {
  return (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d={d}
      />
    </svg>
  )
}

interface ValueCard {
  icon: React.ReactNode
  title: string
  description: string
}

const values: Array<ValueCard> = [
  {
    icon: (
      <ValueIcon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    title: 'Quality-Driven Development',
    description:
      'Every line of code is crafted with care. I prioritize clean architecture, comprehensive testing, and maintainable solutions over quick fixes.',
  },
  {
    icon: (
      <ValueIcon d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    ),
    title: 'Clear Communication',
    description:
      'Technical jargon has its place, but clear communication is key. I keep stakeholders informed with regular updates and transparent progress tracking.',
  },
  {
    icon: <ValueIcon d="M13 10V3L4 14h7v7l9-11h-7z" />,
    title: 'Modern Tech Stack',
    description:
      'I stay current with industry best practices and leverage modern tools like React, TypeScript, and cloud services to build performant, scalable applications.',
  },
  {
    icon: (
      <ValueIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    ),
    title: 'Client-Focused Solutions',
    description:
      'Your business goals drive my technical decisions. I focus on delivering value, understanding your needs, and building solutions that grow with you.',
  },
]

function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <AboutHero />

      {/* Timeline Section */}
      <Timeline />

      {/* Values Section */}
      <section className="py-20 px-6 bg-background-secondary">
        <div className="max-w-5xl mx-auto">
          <FadeInView delay={0}>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4 text-center">
              My Approach
            </h2>
            <p className="text-text-secondary text-center mb-12 max-w-xl mx-auto">
              The principles that guide my work and ensure successful project
              outcomes.
            </p>
          </FadeInView>

          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value, index) => (
              <FadeInView key={value.title} delay={100 + index * 100}>
                <div className="bg-background-primary border border-border-default rounded-lg p-6 h-full hover:border-accent-primary/50 hover:shadow-lg hover:shadow-accent-primary/5 transition-all duration-300 group">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-secondary mb-4 group-hover:bg-accent-primary/20 transition-colors duration-300">
                    {value.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    {value.title}
                  </h3>

                  {/* Description */}
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </FadeInView>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <FadeInView delay={0}>
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Let's Build Something Great
            </h2>
            <p className="text-text-secondary mb-8 max-w-xl mx-auto">
              Interested in working together? I'd love to hear about your
              project and explore how I can help bring your vision to life.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 bg-accent-primary hover:bg-accent-tertiary text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-300"
            >
              Get in Touch
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>
          </FadeInView>
        </div>
      </section>
    </>
  )
}
