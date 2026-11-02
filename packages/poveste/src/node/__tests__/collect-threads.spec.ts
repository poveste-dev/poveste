import { describe, expect, it } from 'vitest'
import { threadCeiling } from '../collect/threads.js'

describe('the ceiling on collection threads', () => {
  it('is four on a machine with cores to spare, whatever the mode', () => {
    expect(threadCeiling(undefined, 'build', 32)).toBe(4)
    expect(threadCeiling(undefined, 'dev', 32)).toBe(4)
  })

  it('stays below the cores on a small machine', () => {
    expect(threadCeiling(undefined, 'build', 4)).toBe(3)
    expect(threadCeiling(undefined, 'dev', 4)).toBe(2)
  })

  it('takes `collectMaxThreads` above the default, up to what the mode allows', () => {
    expect(threadCeiling(8, 'build', 12)).toBe(8)
    expect(threadCeiling(8, 'dev', 12)).toBe(6)
    expect(threadCeiling(16, 'build', 12)).toBe(11)
  })

  it('takes `collectMaxThreads` below the default', () => {
    expect(threadCeiling(1, 'build', 12)).toBe(1)
    expect(threadCeiling(2, 'dev', 12)).toBe(2)
  })

  it('never reaches zero', () => {
    expect(threadCeiling(0, 'build', 12)).toBe(1)
    expect(threadCeiling(undefined, 'build', 1)).toBe(1)
    expect(threadCeiling(undefined, 'dev', 1)).toBe(1)
  })
})
