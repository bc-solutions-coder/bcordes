import { Badge } from '@/components/ui/badge'
import { FadeInView } from '@/components/shared/FadeInView'

export function AboutHero() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background-primary via-background-secondary to-background-primary" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-10">
          {/* Profile Photo Placeholder */}
          <FadeInView delay={0}>
            <div className="relative flex-shrink-0">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary blur-md opacity-50" />

              {/* Profile photo */}
              <img
                src="/profile-picture.png"
                alt="Bryan Cordes"
                className="relative w-40 h-40 rounded-full object-cover border-4 border-background-tertiary"
              />

              {/* Status indicator */}
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-accent-secondary rounded-full border-4 border-background-primary">
                <span className="absolute inset-0 rounded-full bg-accent-secondary animate-ping opacity-75" />
              </div>
            </div>
          </FadeInView>

          {/* Text Content */}
          <div className="text-center md:text-left">
            <FadeInView delay={100}>
              <Badge
                variant="outline"
                className="mb-4 border-accent-primary/50 text-accent-secondary bg-accent-primary/10 px-3 py-1"
              >
                About Me
              </Badge>
            </FadeInView>

            <FadeInView delay={200}>
              <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-2">
                Bryan Cordes
              </h1>
            </FadeInView>

            <FadeInView delay={300}>
              <p className="text-xl md:text-2xl text-accent-secondary font-medium mb-4">
                Full-Stack Software Engineer
              </p>
            </FadeInView>

            <FadeInView delay={400}>
              <p className="text-text-secondary text-lg leading-relaxed max-w-xl mb-6">
                I'm a passionate software engineer with a love for building
                elegant, scalable solutions. With over six years of experience
                across the full stack, I specialize in turning complex problems
                into clean, maintainable code. My approach combines technical
                excellence with clear communication to deliver results that
                truly matter.
              </p>
            </FadeInView>

            <FadeInView delay={500}>
              <div className="flex items-center justify-center md:justify-start gap-2 text-text-tertiary">
                <svg
                  className="w-5 h-5 text-accent-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Available for Remote Work</span>
              </div>
            </FadeInView>
          </div>
        </div>
      </div>
    </section>
  )
}
