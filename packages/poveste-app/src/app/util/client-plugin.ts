import type { ClientSupportPlugin } from '@poveste/shared'
import type { Component } from 'vue'
import { reportStoryError, toStoryError } from '@poveste/shared'
import { clientSupportPlugins } from 'virtual:$poveste-support-plugins-client'
import { occupant } from './occupant.js'

/*
 * A framework's client imports the book's setup file, so a setup file that throws
 * when it loads fails here, for every story, before any story code runs. In a
 * built book nothing else reported it: Vue's production build only logs an async
 * effect's rejection, and every preview stayed blank with the error in the console
 * alone (#1323). Not rethrown, because Vue's development build would rethrow it as
 * an unhandled rejection, whose report would replace this one.
 */
export async function loadClientPlugin(supportPluginId: string | undefined): Promise<ClientSupportPlugin<Component> | undefined> {
  const load = supportPluginId ? clientSupportPlugins[supportPluginId] : undefined
  if (!load) {
    return undefined
  }
  try {
    return await load()
  }
  catch (error) {
    const { message, stack } = toStoryError(error)
    const reported = Object.assign(new Error(`The story renderer failed to load, and it imports the setup file: ${message}`), { stack })
    reportStoryError(reported, {
      storyId: occupant.storyId ?? undefined,
      variantId: occupant.variantId ?? undefined,
    })
    console.error(error)
    return undefined
  }
}
