import { Link, createFileRoute } from '@tanstack/react-router'
import {
  FeaturedWork,
  Hero,
  ServicesGrid,
  SkillsShowcase,
} from '@/features/home'
import { getFeaturedShowcases } from '@/features/projects'
import { useUser } from '@/shared/auth'

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: () => ({ showcases: getFeaturedShowcases() }),
})

function HomePage() {
  const { showcases } = Route.useLoaderData()
  const { user } = useUser()
  const isAdmin = user?.permissions.includes('InquiriesRead') ?? false

  return (
    <main>
      <Hero />
      <ServicesGrid />
      <FeaturedWork showcases={showcases} />
      <SkillsShowcase />

      {!isAdmin && (
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
      )}
    </main>
  )
}
