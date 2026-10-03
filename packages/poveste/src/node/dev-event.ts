import type { Plugin } from '@poveste/shared'
import pc from 'picocolors'

/**
 * Asks each plugin with an `onDevEvent` in turn, and returns the first answer
 * to an event that wants one. An `on…` event goes to every plugin and answers
 * nothing.
 *
 * A plugin that throws is logged under its name and skipped. Left to the
 * listener, the rejection went unhandled and exited `poveste dev` (#1170).
 */
export async function answerDevEvent(plugins: Plugin[], event: string, ask: (plugin: Plugin) => unknown): Promise<unknown> {
  for (const plugin of plugins) {
    if (!plugin.onDevEvent) {
      continue
    }
    try {
      const result = await ask(plugin)
      if (!event.startsWith('on') && result !== undefined) {
        return result
      }
    }
    catch (error) {
      console.error(pc.red(`[Plugin:${plugin.name}]`), `onDevEvent threw on "${event}":`, error)
    }
  }
  return undefined
}
