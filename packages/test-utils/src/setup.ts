import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom does not implement ResizeObserver, which positioned overlays
// (tooltip/popover/dialog arrows and floating-ui positioners) rely on.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserver
}

// jsdom does not implement Element.prototype.scrollIntoView, which listbox-style
// components (Base UI Select) call to keep the highlighted/selected item visible.
if (
  typeof Element !== 'undefined' &&
  !Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')
) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}

// An empty pointerType lets Base UI accept unhighlighted items in simulated clicks.
if (
  typeof MouseEvent !== 'undefined' &&
  !Object.getOwnPropertyDescriptor(MouseEvent.prototype, 'pointerType')
) {
  Object.defineProperty(MouseEvent.prototype, 'pointerType', {
    configurable: true,
    get() {
      return ''
    },
  })
}

afterEach(() => {
  cleanup()
})
