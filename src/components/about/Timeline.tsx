import { FadeInView } from '~/components/shared/FadeInView'

interface TimelineEntry {
  period: string
  role: string
  company: string
  description: string
  isCurrent?: boolean
}

const timelineData: Array<TimelineEntry> = [
  {
    period: 'Nov 2025 - Feb 2026',
    role: 'Freelance Software Engineer',
    company: 'Drop',
    description:
      'Designed and built a customer-facing enforcement management module in Angular 20, enabling violation tracking workflows with complete audit trails for state regulatory compliance.',
    isCurrent: true,
  },
  {
    period: 'July 2021 - Aug 2025',
    role: 'Software Engineer',
    company: 'Valiantys',
    description:
      'Designed, built, and deployed 25+ Angular and React commercial applications. Led software re-architecture into an Nx monorepo, improving code organization and cross-team efficiency.',
  },
  {
    period: 'July 2019 - July 2021',
    role: 'Software Engineer',
    company: 'Hyperion, LLC',
    description:
      'Built applications in an Nx monorepo with TypeScript, Nest.js, and Node.js. Developed APIs for IoT devices and delivered PCI-compliant e-commerce features.',
  },
  {
    period: 'Apr 2019 - June 2019',
    role: 'Quality Assurance Intern',
    company: 'Flightdocs Inc',
    description:
      'Developed automation scripts and user-defined functions for daily testing. Designed and ran smoke tests in pre-production and production environments.',
  },
]

export function Timeline() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <FadeInView delay={0}>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4 text-center">
            Career Journey
          </h2>
          <p className="text-text-secondary text-center mb-12 max-w-xl mx-auto">
            A timeline of my professional growth and the experiences that shaped
            my expertise.
          </p>
        </FadeInView>

        {/* Timeline Container */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-accent-primary via-accent-secondary to-accent-tertiary md:-translate-x-1/2" />

          {/* Timeline Entries */}
          <div className="space-y-12">
            {timelineData.map((entry, index) => (
              <FadeInView key={entry.period} delay={100 + index * 150}>
                <div
                  className={`relative flex flex-col md:flex-row gap-6 md:gap-10 ${
                    index % 2 === 0 ? 'md:flex-row-reverse' : ''
                  }`}
                >
                  {/* Timeline Dot */}
                  <div className="absolute left-0 md:left-1/2 w-4 h-4 -translate-x-1/2 md:-translate-x-1/2 top-1">
                    <div
                      className={`w-full h-full rounded-full border-2 ${
                        entry.isCurrent
                          ? 'bg-accent-secondary border-accent-secondary'
                          : 'bg-background-primary border-accent-primary'
                      }`}
                    />
                    {entry.isCurrent && (
                      <div className="absolute inset-0 rounded-full bg-accent-secondary animate-ping opacity-50" />
                    )}
                  </div>

                  {/* Content Card */}
                  <div
                    className={`ml-8 md:ml-0 md:w-1/2 ${
                      index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'
                    }`}
                  >
                    <div className="bg-background-secondary border border-border-default rounded-lg p-6 hover:border-accent-primary/50 transition-colors duration-300">
                      {/* Period Badge */}
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                          entry.isCurrent
                            ? 'bg-accent-primary/20 text-accent-secondary'
                            : 'bg-background-tertiary text-text-tertiary'
                        }`}
                      >
                        {entry.isCurrent && (
                          <span className="w-2 h-2 rounded-full bg-accent-secondary" />
                        )}
                        {entry.period}
                      </div>

                      {/* Role & Company */}
                      <h3 className="text-xl font-semibold text-text-primary mb-1">
                        {entry.role}
                      </h3>
                      <p className="text-accent-secondary font-medium mb-3">
                        {entry.company}
                      </p>

                      {/* Description */}
                      <p className="text-text-secondary text-sm leading-relaxed">
                        {entry.description}
                      </p>
                    </div>
                  </div>

                  {/* Spacer for alternating layout */}
                  <div className="hidden md:block md:w-1/2" />
                </div>
              </FadeInView>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
