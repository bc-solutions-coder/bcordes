import { vi } from 'vitest'

export function controlMotion(initialMatches = false) {
  const listeners = new Set<
    (event: Pick<MediaQueryListEvent, 'matches'>) => void
  >()
  const media = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener(
      event: string,
      listener: (event: Pick<MediaQueryListEvent, 'matches'>) => void,
    ) {
      if (event === 'change') listeners.add(listener)
    },
    removeEventListener(
      event: string,
      listener: (event: Pick<MediaQueryListEvent, 'matches'>) => void,
    ) {
      if (event === 'change') listeners.delete(listener)
    },
  }
  const matchMedia = vi.fn(() => media)
  vi.stubGlobal('matchMedia', matchMedia)
  return {
    listeners,
    matchMedia,
    change(matches: boolean) {
      media.matches = matches
      for (const listener of listeners) listener({ matches })
    },
  }
}

export function controlIntersections() {
  const observers = new Set<Observer>()
  class Observer {
    readonly targets = new Set<Element>()
    constructor(
      readonly callback: (
        entries: Array<
          Pick<IntersectionObserverEntry, 'target' | 'isIntersecting'>
        >,
      ) => void,
      readonly options?: IntersectionObserverInit,
    ) {
      observers.add(this)
    }
    observe(target: Element) {
      this.targets.add(target)
    }
    unobserve(target: Element) {
      this.targets.delete(target)
    }
    disconnect() {
      this.targets.clear()
    }
  }
  vi.stubGlobal('IntersectionObserver', Observer)
  return {
    observers,
    isObserved(target: Element) {
      return [...observers].some((observer) => observer.targets.has(target))
    },
    intersect(target: Element, isIntersecting: boolean) {
      for (const observer of observers) {
        if (observer.targets.has(target))
          observer.callback([{ target, isIntersecting }])
      }
    },
  }
}
