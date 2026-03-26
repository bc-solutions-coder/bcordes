import { createFileRoute } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { FadeInView } from '@/components/shared/FadeInView'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/resume')({
  component: ResumePage,
})

const experience = [
  {
    title: 'Freelance Software Engineer',
    company: 'Drop',
    period: 'Nov 2025 - Feb 2026',
    description: 'Contract work on regulatory compliance software.',
    highlights: [
      'Designed and built a customer-facing enforcement management module in Angular 20 with complete audit trails for state regulatory compliance',
      'Developed end-to-end corrective action tracking system that streamlined consultant-customer communication',
      'Implemented workflow automation for regulatory violation remediation with real-time tracking',
    ],
  },
  {
    title: 'Software Engineer',
    company: 'Valiantys',
    period: 'July 2021 - Aug 2025',
    description: 'Full-stack development on Atlassian ecosystem applications.',
    highlights: [
      'Designed, built, and deployed 25+ Angular and React commercial applications',
      'Integrated Atlassian Rovo AI agents into company-wide Nx monorepo for scalable automation',
      'Led software re-architecture into Nx monorepo with projected 72% reduction in merge conflicts',
      'Created Electron + React tools integrated with Confluence, leading to 37% increase in early contract completion',
    ],
  },
  {
    title: 'Software Engineer',
    company: 'Hyperion, LLC',
    period: 'July 2019 - July 2021',
    description: 'Full-stack development with focus on IoT and e-commerce.',
    highlights: [
      'Built applications in Nx monorepo with TypeScript, Nest.js, and Node.js',
      'Developed APIs for IoT devices and legacy software integrations',
      'Delivered PCI-compliant e-commerce features and secure Twilio-based verification system',
      'Implemented GraphQL queries/mutations and migrated from MySQL to Postgres',
    ],
  },
  {
    title: 'Quality Assurance Intern',
    company: 'Flightdocs Inc',
    period: 'Apr 2019 - June 2019',
    description: 'Quality assurance and test automation.',
    highlights: [
      'Developed automation scripts and user-defined functions for daily testing',
      'Designed and ran smoke tests in pre-production and production environments',
      'Reported on automation coverage, issues, and improvement opportunities',
    ],
  },
]

const skills = {
  Frontend: [
    'JavaScript',
    'TypeScript',
    'Angular',
    'React',
    'Svelte',
    'Blazor',
    'GraphQL',
    'HTML5',
    'SCSS',
  ],
  Backend: ['Node.js', 'Nest.js', 'C#', 'Java'],
  'Cloud & Infrastructure': ['AWS', 'Terraform', 'Docker', 'CI/CD pipelines'],
  'Tools & Platforms': [
    'Atlassian Suite',
    'Jira',
    'Confluence',
    'Rovo',
    'Electron',
    'Nx',
    'Twilio',
  ],
  Databases: ['MySQL', 'PostgreSQL'],
}

const education = [
  {
    degree: 'Bachelor of Science, Software Engineering',
    school: 'Florida Gulf Coast University, Fort Myers, FL',
    year: 'Aug 2014 - May 2019',
  },
]

function ResumePage() {
  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <section className="border-b border-border-default bg-background-secondary">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <FadeInView>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="mb-2 text-4xl font-bold text-text-primary md:text-5xl">
                  Resume
                </h1>
                <p className="text-lg text-text-secondary">
                  6+ years of professional software engineering experience
                </p>
              </div>
              <a
                href="/Cordes-Resume.pdf"
                download
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-tertiary"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            </div>
          </FadeInView>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Experience */}
        <FadeInView delay={100}>
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-bold text-text-primary">
              Experience
            </h2>
            <div className="space-y-8">
              {experience.map((job, index) => (
                <div
                  key={index}
                  className="border-l-2 border-accent-primary/30 pl-6"
                >
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold text-text-primary">
                      {job.title}
                    </h3>
                    <span className="text-sm text-text-tertiary">
                      {job.period}
                    </span>
                  </div>
                  <p className="mb-2 text-accent-secondary">{job.company}</p>
                  <p className="mb-3 text-text-secondary">{job.description}</p>
                  <ul className="space-y-1">
                    {job.highlights.map((highlight, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-text-secondary"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-primary" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </FadeInView>

        {/* Skills */}
        <FadeInView delay={200}>
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-bold text-text-primary">
              Skills
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {Object.entries(skills).map(([category, items]) => (
                <div key={category}>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent-secondary">
                    {category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {items.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="bg-background-secondary border border-border-default text-text-secondary"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </FadeInView>

        {/* Education */}
        <FadeInView delay={300}>
          <section>
            <h2 className="mb-6 text-2xl font-bold text-text-primary">
              Education
            </h2>
            <div className="space-y-4">
              {education.map((edu, index) => (
                <div
                  key={index}
                  className="border-l-2 border-accent-primary/30 pl-6"
                >
                  <h3 className="font-semibold text-text-primary">
                    {edu.degree}
                  </h3>
                  <p className="text-text-secondary">{edu.school}</p>
                  <p className="text-sm text-text-tertiary">{edu.year}</p>
                </div>
              ))}
            </div>
          </section>
        </FadeInView>
      </div>
    </div>
  )
}
