import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// This package renders only a context provider — none of the jsdom polyfills
// packages/ui needs (ResizeObserver, scrollIntoView, MouseEvent.pointerType)
// apply here, because nothing in it positions an overlay or drives a listbox.

afterEach(() => {
  cleanup()
})
