import type { ServerRunPayload } from '@poveste/shared'
import type { SvelteStorySetupApi } from '../helpers.js'
import { tick } from 'svelte'
// @ts-expect-error virtual module id
import * as generatedSetup from 'virtual:$poveste-generated-global-setup'
// @ts-expect-error virtual module id
import * as setup from 'virtual:$poveste-setup'
import { addStoryContext, storyFileContext } from '../contexts.js'
import {
  callSetupFunctions,
  mountSvelteComponent,
} from '../util/svelte.js'
import Story from './Story.svelte'
import Variant from './Variant.svelte'

export async function run({ file, el, storyData }: ServerRunPayload) {
  const { default: Comp } = await import(/* @vite-ignore */ file.moduleId)

  const mountedApp = await mountSvelteComponent(Comp, {
    target: el,
    props: {
      Hst: {
        Story,
        Variant,
      },
    },
    // Keyed by the same symbols the components read, through the map `mount`
    // takes — a runner is not a component, so it cannot call `set` (#981).
    context: new Map<symbol, unknown>([
      [addStoryContext.key, (data: (typeof storyData)[number]) => {
        storyData.push(data)
      }],
      [storyFileContext.key, file],
    ]),
  }, 'client')
  const app = mountedApp.app

  const setupApi: SvelteStorySetupApi = {
    app,
    // No story or variant exists while collecting.
    story: undefined,
    variant: undefined,
  }

  await callSetupFunctions(generatedSetup, setup, setupApi)

  await tick()

  // A file with no `Hst.Story` in it collects nothing, which is a thing people
  // write — a scratch file, a component that lost its story tag in a refactor.
  // The optional chain below used to guard only the read: with no story the
  // condition came out true and the body then dereferenced the same `undefined`,
  // so the collector crashed the whole build instead of skipping one file. The
  // Vue collector warns and carries on, and the shared warning downstream
  // (`No story found for …`) is already written for exactly this.
  if (!storyData[0]) {
    mountedApp.destroy()
    return
  }

  if (!storyData[0].variants.length) {
    storyData[0].variants.push({
      id: '_default',
      title: 'default',
    })
  }

  mountedApp.destroy()
}
