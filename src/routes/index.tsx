import { Link, createFileRoute } from '@tanstack/react-router'
import { Hero } from '@/components/home/Hero'
import { ServicesGrid } from '@/components/home/ServicesGrid'
import { SkillsShowcase } from '@/components/home/SkillsShowcase'
import { FeaturedWork } from '@/components/home/FeaturedWork'
import { getFeaturedShowcases } from '@/content/projects'

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: () => ({ showcases: getFeaturedShowcases() }),
})

function HomePage() {
  const { showcases } = Route.useLoaderData()

  return (
    <main>
      <Hero />
      <ServicesGrid />
      <FeaturedWork showcases={showcases} />
      <SkillsShowcase />

      <section className="bg-background py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Let's Work Together
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Have a project in mind? I'd love to hear about it. Reach out and
            let's discuss how I can help.
          </p>
          <Link
            to="/contact"
            className="mt-8 inline-block rounded-lg bg-primary px-8 py-3 text-white font-semibold"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </main>
  )
}
