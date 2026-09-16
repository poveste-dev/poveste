import { describe, expect, it } from 'vitest'
import { createRunner } from './runner.js'

// A module server that answers with fixed code, so the evaluator is what runs.
function runnerFor(code: string) {
  return createRunner(async (name, data) => {
    if (name === 'getBuiltins') {
      return []
    }
    const [url] = data as [string]
    return { code, file: `/fixture${url}`, id: `/fixture${url}`, url, invalidate: false }
  })
}

describe('createRunner', () => {
  it('runs an inlined CommonJS module that assigns to exports', async () => {
    // vite-node gave inlined modules `exports`, `module` and `require`; Vite's
    // own evaluator does not, and a CommonJS dependency inlined through
    // `viteNodeInlineDeps` threw `exports is not defined` (#167).
    const runner = runnerFor(`exports.greeting = 'hello from cjs'`)

    const mod = await runner.import('/greeting.js')

    expect(mod.greeting).toBe('hello from cjs')
  })

  it('makes module.exports the default export', async () => {
    const runner = runnerFor(`module.exports = { answer: 42 }`)

    const mod = await runner.import('/answer.js')

    expect(mod.default).toEqual({ answer: 42 })
    expect(mod.answer).toBe(42)
  })

  it('gives an inlined module require', async () => {
    const runner = runnerFor(`exports.base = require('node:path').basename('/stories/button.js')`)

    const mod = await runner.import('/base.js')

    expect(mod.base).toBe('button.js')
  })
})
