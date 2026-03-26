import { Code, Layers, MessageSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FadeInView } from '@/components/shared/FadeInView'

interface Service {
  icon: LucideIcon
  title: string
  description: string
  skills: Array<string>
}

const services: Array<Service> = [
  {
    icon: Code,
    title: 'Frontend Development',
    description:
      'Modern, responsive web applications built with React, TypeScript, and cutting-edge frameworks. Focused on performance, accessibility, and exceptional user experience.',
    skills: ['React', 'TypeScript', 'Next.js', 'TailwindCSS'],
  },
  {
    icon: Layers,
    title: 'Full-Stack Solutions',
    description:
      'End-to-end development from database design to deployment. Scalable architectures using Node.js, PostgreSQL, and cloud infrastructure.',
    skills: ['Node.js', 'PostgreSQL', 'AWS', 'Docker'],
  },
  {
    icon: MessageSquare,
    title: 'Technical Consulting',
    description:
      'Strategic guidance on architecture decisions, code reviews, and team mentorship. Helping teams adopt best practices and improve development workflows.',
    skills: ['Architecture', 'Code Review', 'Mentorship', 'Agile'],
  },
]

export function ServicesGrid() {
  return (
    <section className="py-24 bg-background-secondary">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <FadeInView delay={0}>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              What I Do
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Delivering comprehensive software solutions tailored to your
              business needs
            </p>
          </div>
        </FadeInView>

        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <FadeInView key={service.title} delay={100 + index * 100}>
              <Card className="group h-full bg-white border-l-4 border-accent-decorative shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-accent-light flex items-center justify-center mb-4">
                    <service.icon className="w-6 h-6 text-accent-primary" />
                  </div>
                  <CardTitle className="text-xl text-text-primary">
                    {service.title}
                  </CardTitle>
                  <CardDescription className="text-text-secondary leading-relaxed">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {service.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 text-xs font-semibold rounded-md bg-accent-light text-accent-primary"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  )
}
