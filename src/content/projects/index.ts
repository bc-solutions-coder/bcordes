import type { ComponentType } from 'react'
import { meta as wallowMeta, Content as WallowContent } from './wallow'
import { meta as bcordesMeta, Content as BcordesContent } from './bcordes'

export interface ShowcaseMeta {
  slug: string
  title: string
  description: string
  client: string
  year: number
  tags: string[]
  featured: boolean
  image?: string
}

export interface Showcase extends ShowcaseMeta {
  Content: ComponentType
}

const projects: Showcase[] = [
  { ...wallowMeta, Content: WallowContent },
  { ...bcordesMeta, Content: BcordesContent },
]

function sorted(items: ShowcaseMeta[]): ShowcaseMeta[] {
  return [...items].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1
    return b.year - a.year
  })
}

export function getShowcases(): ShowcaseMeta[] {
  return sorted(projects.map(({ Content: _, ...meta }) => meta))
}

export function getShowcase(slug: string): Showcase | undefined {
  return projects.find((p) => p.slug === slug)
}

export function getShowcaseContent(slug: string): ComponentType | undefined {
  return projects.find((p) => p.slug === slug)?.Content
}

export function getFeaturedShowcases(): ShowcaseMeta[] {
  return sorted(
    projects
      .filter((p) => p.featured)
      .map(({ Content: _, ...meta }) => meta),
  )
}
