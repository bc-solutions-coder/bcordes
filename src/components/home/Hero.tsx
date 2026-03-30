import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/shadcn/button'
import { FadeInView } from '@/components/shared/FadeInView'
import { useUser } from '@/hooks/useUser'

interface Stat {
  value: string
  label: string
}

const stats: Array<Stat> = [
  { value: '6+', label: 'Years Experience' },
  { value: '25+', label: 'Projects Delivered' },
  { value: '100%', label: 'Client Satisfaction' },
]

export function Hero() {
  const { user } = useUser()
  const isAdmin = user?.roles.includes('admin') ?? false

  return (
    <section
      className="relative overflow-hidden bg-background"
      aria-label="Introduction"
    >
      <div className="max-w-[1200px] mx-auto px-8 pt-20 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Text Column */}
        <div className="max-w-[560px]">
          <FadeInView delay={0}>
            <div
              className="inline-flex items-center gap-1.5 bg-secondary text-primary-hover px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6"
              role="status"
            >
              <span className="w-2 h-2 bg-decorative rounded-full animate-pulse-dot" />
              Available for Projects
            </div>
          </FadeInView>

          <FadeInView delay={100}>
            <h1 className="font-[Outfit] text-4xl md:text-5xl lg:text-[3.6rem] font-extrabold text-foreground mb-4 leading-[1.15]">
              Professional
              <br />
              Software{' '}
              <span className="bg-gradient-to-t from-decorative/25 from-[30%] to-transparent to-[30%]">
                Engineering
              </span>
            </h1>
          </FadeInView>

          <FadeInView delay={200}>
            <p className="text-lg text-foreground-secondary mb-8 max-w-[460px] leading-relaxed">
              BC Solutions delivers high-quality, scalable web applications with
              modern technologies. From concept to deployment, I build solutions
              that perform.
            </p>
          </FadeInView>

          <FadeInView delay={300}>
            <div className="flex flex-wrap gap-4 mb-0">
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-3 h-auto rounded-[10px]"
              >
                <Link to="/projects">View My Projects</Link>
              </Button>
              {!isAdmin && (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-border hover:border-primary hover:text-primary text-foreground font-semibold px-6 py-3 h-auto rounded-[10px]"
                >
                  <Link to="/contact">Get in Touch</Link>
                </Button>
              )}
            </div>
          </FadeInView>

          <FadeInView delay={400}>
            <div
              className="flex gap-10 mt-12 pt-8 border-t border-border"
              role="list"
              aria-label="Key statistics"
            >
              {stats.map((stat) => (
                <div key={stat.label} role="listitem">
                  <div className="font-[Outfit] text-3xl font-bold text-primary">
                    {stat.value}
                  </div>
                  <div className="text-xs font-medium text-foreground-secondary">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </FadeInView>
        </div>

        {/* Graphic Column */}
        <div
          className="hidden lg:flex justify-center items-center"
          aria-hidden="true"
        >
          <div className="w-[400px] h-[400px] rounded-3xl bg-secondary relative overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-secondary to-decorative-muted" />

            {/* Outer rotating ring with orbiting dots */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[300px] h-[300px] rounded-full border-2 border-primary/25 animate-orbit relative">
                {/* Dot at top of outer ring */}
                <div className="absolute top-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-decorative rounded-full animate-counter-orbit" />
                {/* Dot at bottom of outer ring */}
                <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-primary rounded-full animate-counter-orbit" />
              </div>
            </div>

            {/* Inner counter-rotating ring with orbiting dots */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[200px] h-[200px] rounded-full border-2 border-primary/25 animate-counter-orbit relative">
                {/* Dot at right of inner ring */}
                <div className="absolute top-1/2 right-[-5px] -translate-y-1/2 w-2.5 h-2.5 bg-decorative rounded-full animate-orbit" />
                {/* Dot at left of inner ring */}
                <div className="absolute top-1/2 left-[-5px] -translate-y-1/2 w-2.5 h-2.5 bg-primary/70 rounded-full animate-orbit" />
              </div>
            </div>

            {/* Center circle with logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[100px] h-[100px] rounded-full bg-primary/12 flex items-center justify-center">
                <img
                  src="/BC-Solutions-no-background.svg"
                  alt=""
                  className="w-16 h-16"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
