import { expect } from 'vitest'

// A check returns its problems. On failure this prints them the way the check
// would, one per line and then what to do about them, where `toEqual([])` would
// bury both under an expected/received diff.
expect.extend({
  toHaveNoProblems(received: string[], remedy?: string) {
    return {
      pass: received.length === 0,
      message: () => this.isNot
        ? 'expected problems, found none'
        : [`expected no problems, found ${received.length}:`, ...received.map(problem => `  • ${problem}`), ...(remedy ? ['', remedy] : [])].join('\n'),
    }
  },
})

declare module 'vitest' {
  // Merging needs vitest's own type parameters, `T` included, though this matcher reads none of them.
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    toHaveNoProblems: (remedy?: string) => R
  }
}
