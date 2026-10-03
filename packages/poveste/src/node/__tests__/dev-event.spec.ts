import type { Plugin } from '@poveste/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { answerDevEvent } from '../dev-event.js'

function plugin(name: string, onDevEvent: () => unknown): Plugin {
  return { name, onDevEvent } as Plugin
}

const throwing = plugin('probe-throw', () => {
  throw new Error('probe: onDevEvent threw')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('answerDevEvent', () => {
  it('skips a plugin that throws and returns the next answer', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await answerDevEvent([throwing, plugin('vue', () => ['src/Button.vue'])], 'listVueComponents', p => p.onDevEvent!({} as any))

    expect(result).toEqual(['src/Button.vue'])
  })

  it('logs the throw under the plugin\'s name', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await answerDevEvent([throwing], 'listVueComponents', p => p.onDevEvent!({} as any))

    expect(error).toHaveBeenCalledWith(expect.stringContaining('[Plugin:probe-throw]'), expect.stringContaining('listVueComponents'), expect.any(Error))
  })

  // A rejection here was unhandled in the listener, and Node exited on it.
  it('resolves rather than rejects when the only plugin throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(answerDevEvent([throwing], 'listVueComponents', p => p.onDevEvent!({} as any))).resolves.toBeUndefined()
  })

  it('still reaches every plugin with an `on…` event after one throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const after = vi.fn()

    await answerDevEvent([throwing, plugin('after', after)], 'onStoryOpened', p => p.onDevEvent!({} as any))

    expect(after).toHaveBeenCalledOnce()
  })
})
