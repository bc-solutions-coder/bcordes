import { Content as WallowContent, meta as wallowMeta } from './wallow'
import { Content as BcordesContent, meta as bcordesMeta } from './bcordes'
import type { ComponentType } from 'react'

export interface ShowcaseMeta {
  slug: string
  title: string
  description: string
  client: string
  year: number
  tags: Array<string>
  featured: boolean
  image?: string
}

export interface Showcase extends ShowcaseMeta {
  Content: ComponentType
}

const projects: Array<Showcase> = [
  { ...wallowMeta, Content: WallowContent },
  { ...bcordesMeta, Content: BcordesContent },
]

function sorted(items: Array<ShowcaseMeta>): Array<ShowcaseMeta> {
  return [...items].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1
    return b.year - a.year
  })
}

export function getShowcases(): Array<ShowcaseMeta> {
  return sorted(projects.map(({ Content: _, ...meta }) => meta))
}

export function getShowcase(slug: string): Showcase | undefined {
  return projects.find((p) => p.slug === slug)
}

export function getShowcaseContent(slug: string): ComponentType | undefined {
  return projects.find((p) => p.slug === slug)?.Content
}

export function getFeaturedShowcases(): Array<ShowcaseMeta> {
  return sorted(
    projects.filter((p) => p.featured).map(({ Content: _, ...meta }) => meta),
  )
}
