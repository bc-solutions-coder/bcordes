import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { ShowcaseMeta } from '@/content/projects'
import { getShowcases } from '@/content/projects'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectFilter } from '@/components/projects/ProjectFilter'
import { FadeInView } from '@/components/shared/FadeInView'

export const Route = createFileRoute('/projects/')({
  component: WorkPage,
  loader: () => ({ showcases: getShowcases() }),
})

function WorkPage() {
  const { showcases } = Route.useLoaderData()

  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  // Extract unique tags and years from all showcases
  const { tags, years } = useMemo(() => {
    const tagSet = new Set<string>()
    const yearSet = new Set<number>()

    showcases.forEach((showcase: ShowcaseMeta) => {
      showcase.tags.forEach((tag) => tagSet.add(tag))
      yearSet.add(showcase.year)
    })

    return {
      tags: Array.from(tagSet).sort(),
      years: Array.from(yearSet).sort((a, b) => b - a),
    }
  }, [showcases])

  // Filter showcases based on selected tag and year
  const filteredShowcases = useMemo(() => {
    return showcases.filter((showcase: ShowcaseMeta) => {
      const matchesTag =
        selectedTag === null ||
        showcase.tags.some(
          (tag) => tag.toLowerCase() === selectedTag.toLowerCase(),
        )
      const matchesYear =
        selectedYear === null || showcase.year === selectedYear
      return matchesTag && matchesYear
    })
  }, [showcases, selectedTag, selectedYear])

  const handleTagChange = (tag: string | null) => {
    setSelectedTag(tag)
  }

  const handleYearChange = (year: number | null) => {
    setSelectedYear(year)
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Page Header */}
      <section className="border-b border-border-default bg-background-secondary">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
          <FadeInView>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-text-primary md:text-5xl lg:text-6xl">
              Projects
            </h1>
          </FadeInView>
          <FadeInView delay={100}>
            <p className="max-w-2xl text-lg text-text-secondary md:text-xl">
              A selection of projects I have worked on, showcasing my experience
              across different industries and technologies.
            </p>
          </FadeInView>
        </div>
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        {/* Filters */}
        <FadeInView delay={200}>
          <ProjectFilter
            tags={tags}
            years={years}
            selectedTag={selectedTag}
            selectedYear={selectedYear}
            onTagChange={handleTagChange}
            onYearChange={handleYearChange}
            className="mb-12"
          />
        </FadeInView>

        {/* Results Count */}
        <FadeInView delay={300}>
          <p className="mb-8 text-sm text-text-tertiary">
            Showing {filteredShowcases.length} of {showcases.length} projects
            {(selectedTag || selectedYear) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTag(null)
                  setSelectedYear(null)
                }}
                className="ml-2 text-accent-primary hover:text-accent-secondary hover:underline transition-colors"
              >
                Clear filters
              </button>
            )}
          </p>
        </FadeInView>

        {/* Projects Grid */}
        {filteredShowcases.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredShowcases.map((showcase: ShowcaseMeta, index: number) => (
              <FadeInView key={showcase.slug} delay={400 + index * 100}>
                <ProjectCard showcase={showcase} />
              </FadeInView>
            ))}
          </div>
        ) : (
          <FadeInView delay={400}>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 text-6xl text-text-tertiary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-text-primary">
                No projects found
              </h3>
              <p className="mb-6 text-text-secondary">
                Try adjusting your filters to see more results.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedTag(null)
                  setSelectedYear(null)
                }}
                className="rounded-lg bg-accent-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-secondary"
              >
                Clear all filters
              </button>
            </div>
          </FadeInView>
        )}
      </section>
    </div>
  )
}
