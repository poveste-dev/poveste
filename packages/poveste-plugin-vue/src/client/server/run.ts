import type { ServerRunPayload, ServerStory } from '@poveste/shared'
import type { Vue3StorySetupApi, Vue3StorySetupHandler } from '../../helpers.js'
import { getSetupHook } from '@poveste/shared'
// @ts-expect-error virtual module id
import * as generatedSetup from 'virtual:$poveste-generated-global-setup'
// @ts-expect-error virtual module id
import * as setup from 'virtual:$poveste-setup'
import { createApp, h } from 'vue'
import { VUE_SETUP_HOOK_NAMES } from '../../setup-hooks.js'
import { addStoryContext, storyFileContext } from './context.js'
import Story from './Story.js'
import Variant from './Variant.js'

export async function run({ file, storyData, el }: ServerRunPayload) {
  const { default: Comp } = await import(/* @vite-ignore */ file.moduleId)

  const app = createApp({
    // Provided from `setup` rather than the options object so the keys can be
    // the symbols the components inject; the options form takes string keys.
    setup() {
      addStoryContext.provide((data: ServerStory) => {
        storyData.push(data)
      })
      storyFileContext.provide(file)
    },
    render() {
      return h(Comp)
    },
  })

  app.component('Story', Story)

  app.component('Variant', Variant)

  // Call app setups to resolve global assets such as components

  const setupApi: Vue3StorySetupApi = {
    app,
    // No story or variant exists while collecting.
    story: undefined,
    variant: undefined,
    addWrapper: () => { /* noop */ },
  }

  const generatedSetupFn = getSetupHook<Vue3StorySetupHandler>(generatedSetup, VUE_SETUP_HOOK_NAMES)
  if (generatedSetupFn) {
    await generatedSetupFn(setupApi)
  }

  const setupFn = getSetupHook<Vue3StorySetupHandler>(setup, VUE_SETUP_HOOK_NAMES)
  if (setupFn) {
    await setupFn(setupApi)
  }

  app.mount(el)

  if (Comp.doc) {
    const el = document.createElement('div')
    el.innerHTML = Comp.doc
    const text = el.textContent
    storyData.forEach((s) => {
      s.docsText = text
    })
  }

  app.unmount()
}
