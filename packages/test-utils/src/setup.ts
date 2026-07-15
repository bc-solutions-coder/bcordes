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
  globalThis.ResizeObserver =
    ResizeObserver as unknown as typeof globalThis.ResizeObserver
}

// jsdom does not implement Element.prototype.scrollIntoView, which listbox-style
// components (Base UI Select) call to keep the highlighted/selected item visible.
if (
  typeof Element !== 'undefined' &&
  !Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')
) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}

// jsdom's MouseEvent has no `pointerType` property. Base UI treats a click that
// carries no pointer data as a "cannot activate an unhighlighted item" guard,
// so a bare fireEvent.click never commits a Select item. Real browsers surface
// an empty-string pointerType for programmatic/assistive activation, which Base
// UI honours; expose the same so test clicks behave like real activations.
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
