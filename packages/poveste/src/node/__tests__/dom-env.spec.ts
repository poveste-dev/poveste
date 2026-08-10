import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDomEnv } from '../dom/env.js'

describe('createDomEnv', () => {
  let env: ReturnType<typeof createDomEnv>
  let errorSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => {
    env?.destroy()
    errorSpy?.mockRestore()
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
