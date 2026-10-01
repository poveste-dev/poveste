import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDomEnv, resetDomEnv } from '../dom/env.js'

describe('createDomEnv', () => {
  let env: ReturnType<typeof createDomEnv>
  let errorSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => {
    env?.destroy()
    errorSpy?.mockRestore()
  })

  describe('when a script inside the environment throws', () => {
    /*
     * `runScripts: 'dangerously'` makes the environment a separate realm, so the
     * error jsdom hands back fails `instanceof Error` and an `instanceof` test
     * drops the stack in favour of jsdom's one-line `Uncaught [Error: …]`
     * summary (#1093). The stack is the whole value of the report: it is what
     * says which line of a story threw.
     */
    it('logs the stack of the error, not jsdom\'s one-line summary', () => {
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      env = createDomEnv()
      const script = env.window.document.createElement('script')
      script.textContent = 'throw new Error("a story threw")'

      env.window.document.body.appendChild(script)

      expect(errorSpy).toHaveBeenCalledTimes(1)
      const logged = String(errorSpy.mock.calls[0]?.[0])
      expect(logged).toContain('a story threw')
      expect(logged).toMatch(/\n\s+at /)
    })
  })

  describe('when a stylesheet contains CSS jsdom cannot parse', () => {
    // An unparseable selector is one of the few inputs jsdom 28+ still reports
    // a css-parsing jsdomError for, so it is what keeps this guard honest.
    // Remove the suppression in `env.ts` and this test fails.
    it('does not log a css-parsing jsdomError', () => {
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      env = createDomEnv()
      const style = env.window.document.createElement('style')
      style.textContent = '.btn[[[ { color: red }'

      env.window.document.head.appendChild(style)

      expect(errorSpy).not.toHaveBeenCalled()
    })

    // The symptom that motivated the suppression. jsdom now drops the unknown
    // at-rule silently and keeps the rest of the sheet, so this passes on its
    // own merits — it is here to catch a regression, not to cover the guard.
    it('parses a Tailwind v4 @theme sheet without complaining', () => {
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      env = createDomEnv()
      const style = env.window.document.createElement('style')
      style.textContent = '@theme { --color-brand: oklch(0.7 0.1 200); }\n.btn { color: var(--color-brand) }'

      env.window.document.head.appendChild(style)

      expect(errorSpy).not.toHaveBeenCalled()
      expect(env.window.document.styleSheets[0].cssRules).toHaveLength(1)
    })
  })

  describe('the interfaces jsdom does not implement', () => {
    /*
     * jsdom gives `Screen` seven properties and no `orientation`, and has no
     * `ScreenOrientation` constructor at all — so the property is absent rather
     * than present and inert, and there is nothing to detect but the absence.
     *
     * Quasar's Screen plugin reads it unguarded while installing:
     * `const { type, angle } = window.screen.orientation` (#1053).
     */
    it('gives `screen.orientation` a type and an angle to destructure', () => {
      env = createDomEnv()

      const { type, angle } = env.window.screen.orientation

      expect(type).toBe('landscape-primary')
      expect(angle).toBe(0)
    })

    it('lets a listener register on it without throwing', () => {
      env = createDomEnv()

      expect(() => env.window.screen.orientation.addEventListener('change', () => {})).not.toThrow()
    })
  })

  describe('when a script throws an unhandled exception', () => {
    it('forwards the error to console.error', () => {
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      env = createDomEnv()
      const script = env.window.document.createElement('script')
      script.textContent = 'throw new Error("boom from story script")'

      env.window.document.head.appendChild(script)

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('boom from story script'))
    })
  })
})

describe('resetDomEnv', () => {
  let env: ReturnType<typeof createDomEnv>

  afterEach(() => {
    env?.destroy()
  })

  it('returns a dirtied environment to its pristine state', () => {
    env = createDomEnv()
    const doc = env.window.document

    doc.body.classList.add('theme-dark')
    doc.documentElement.setAttribute('lang', 'fr')
    doc.body.append(doc.createElement('div'))
    doc.head.append(doc.createElement('style'))
    // Proxied onto the global only on some node versions.
    env.window.localStorage?.setItem('seen', '1')
    ;(env.window as any).__setupInstalled = true

    resetDomEnv(env)

    expect(doc.body.getAttributeNames()).toEqual([])
    expect(doc.documentElement.getAttributeNames()).toEqual([])
    expect(doc.body.children).toHaveLength(0)
    expect(doc.head.children).toHaveLength(0)
    expect(env.window.localStorage?.getItem('seen') ?? null).toBeNull()
    // A setup marking itself installed would skip later stories in the worker.
    expect((env.window as any).__setupInstalled).toBeUndefined()
  })

  it('leaves the globals the environment itself installed', () => {
    env = createDomEnv()

    resetDomEnv(env)

    expect(typeof env.window.ResizeObserver).toBe('function')
    expect(typeof env.window.matchMedia).toBe('function')
    // A property on `screen` rather than a key on `window`, so the reset's key
    // sweep cannot reach it today and this says so if the sweep ever widens.
    expect(env.window.screen.orientation?.type).toBe('landscape-primary')
    expect(env.window.document.body).toBeTruthy()
  })
})
