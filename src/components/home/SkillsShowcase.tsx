import { FadeInView } from '~/components/shared/FadeInView'

interface SkillCategory {
  name: string
  skills: Array<string>
}

const skillCategories: Array<SkillCategory> = [
  {
    name: 'Frontend',
    skills: [
      'React',
      'TypeScript',
      'Next.js',
      'TailwindCSS',
      'Vue.js',
      'HTML/CSS',
    ],
  },
  {
    name: 'Backend',
    skills: ['Node.js', 'Python', 'Java', 'PostgreSQL', 'MongoDB', 'Redis'],
  },
  {
    name: 'Tools',
    skills: ['Git', 'Docker', 'Kubernetes', 'Webpack', 'Vite', 'Jest'],
  },
  {
    name: 'Cloud',
    skills: ['AWS', 'GCP', 'Vercel', 'Cloudflare', 'CI/CD', 'Terraform'],
  },
]

export function SkillsShowcase() {
  return (
    <section className="py-24 bg-background-secondary">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <FadeInView delay={0}>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Technologies & Skills
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              A comprehensive toolkit built over years of professional
              experience
            </p>
          </div>
        </FadeInView>

        {/* Skills grid by category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {skillCategories.map((category, categoryIndex) => (
            <FadeInView key={category.name} delay={100 + categoryIndex * 100}>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="h-1 bg-accent-primary" />
                <div className="p-5">
                  <h3 className="text-base font-bold text-text-primary mb-4">
                    {category.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {category.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-full bg-white border border-border-default text-sm font-medium text-text-primary hover:border-accent-primary hover:bg-accent-primary/10 hover:text-accent-primary transition-all duration-200 cursor-default"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  )
}
