import {
  JSDOM,
  VirtualConsole,
} from 'jsdom'
import { populateGlobal } from './util.js'

// jsdom error types — not exported by jsdom.
const JSDOM_ERROR_CSS_PARSING = 'css-parsing'
const JSDOM_ERROR_UNHANDLED_EXCEPTION = 'unhandled-exception'

// CSS jsdom's parser can't make sense of makes it emit a jsdomError per
// stylesheet, so collecting stories from an app with such a stylesheet prints
// "Could not parse CSS stylesheet" over and over. The parser recovers on its
// own and keeps the valid rules, so the message is pure noise: drop
// css-parsing errors, mirror jsdom's default forwardTo for the rest.
//
// jsdom 28 moved to css-tree, which recovers browser-style and stays quiet for
// most of what jsdom 27 complained about — Tailwind v4's `@theme`, unknown
// at-rules, unterminated strings. It still reports some inputs (an
// unparseable selector, for one), so this stays.
function createVirtualConsole(): VirtualConsole | undefined {
  if (!console || !globalThis.console) return undefined
  const virtualConsole = new VirtualConsole().forwardTo(globalThis.console, { jsdomErrors: 'none' })
  virtualConsole.on('jsdomError', (err: Error & { type?: string, cause?: { stack?: string } }) => {
    if (err.type === JSDOM_ERROR_CSS_PARSING) return
    if (err.type === JSDOM_ERROR_UNHANDLED_EXCEPTION) {
      globalThis.console.error(err.cause?.stack ?? err.message)
    }
    else {
      globalThis.console.error(err.message)
    }
  })
  return virtualConsole
}

export function createDomEnv() {
  const dom = new JSDOM(
    '<!DOCTYPE html>',
    {
      pretendToBeVisual: true,
      runScripts: 'dangerously',
      url: 'http://localhost:3000',
      virtualConsole: createVirtualConsole(),
      includeNodeLocations: false,
      contentType: 'text/html',
    },
  )

  const { keys, originals } = populateGlobal(globalThis, dom.window, { bindFunctions: true })

  function destroy() {
    keys.forEach(key => delete globalThis[key])
    originals.forEach((v, k) => {
      globalThis[k] = v
    })
  }

  window.ResizeObserver = window.ResizeObserver || class ResizeObserver {
    disconnect(): void { /* noop */ }
    observe(_target: Element, _options?: ResizeObserverOptions): void { /* noop */ }
    unobserve(_target: Element): void { /* noop */ }
  }

  window.IntersectionObserver = window.IntersectionObserver || class IntersectionObserver {
    root: Element
    rootMargin: string
    thresholds: number[]
    disconnect(): void { /* noop */ }
    observe = (_target: Element) => void { /* noop */ }
    unobserve(_target: Element): void { /* noop */ }
    takeRecords(): IntersectionObserverEntry[] { return [] }
  }

  window.matchMedia = window.matchMedia || ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }))

  return {
    window,
    destroy,
  }
}
