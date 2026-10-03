import type { Plugin } from '@poveste/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { answerDevEvent, runDevCommand } from '../dev-event.js'

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

describe('runDevCommand', () => {
  // A rejection here was unhandled in the listener, and Node exited on it (#1176).
  it('reports a server action that throws, rather than rejecting', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const commands = [{ id: 'generate', serverAction: () => {
      throw new Error('File src/Button.story.vue already exists')
    } }]

    await expect(runDevCommand(commands, 'generate', {})).resolves.toEqual({ id: 'generate', error: 'File src/Button.story.vue already exists' })
  })

  it('waits for the server action before reporting success', async () => {
    let done = false
    const commands = [{ id: 'generate', serverAction: async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      done = true
    } }]

    await runDevCommand(commands, 'generate', {})

    expect(done).toBe(true)
  })

  it('reports success for a command with no server half', async () => {
    await expect(runDevCommand([{ id: 'builtin:docs' }], 'builtin:docs', {})).resolves.toEqual({ id: 'builtin:docs' })
  })
})
