import type { ServerRunPayload } from '@poveste/shared'
import type { Vue3StorySetupApi, Vue3StorySetupHandler } from '../../helpers.js'
import { getSetupHook } from '@poveste/shared'
// @ts-expect-error virtual module id
import * as generatedSetup from 'virtual:$poveste-generated-global-setup'
// @ts-expect-error virtual module id
import * as setup from 'virtual:$poveste-setup'
import { createApp, h } from 'vue'
import { VUE_SETUP_HOOK_NAMES } from '../../setup-hooks.js'
import Story from './Story.js'
import Variant from './Variant.js'

export async function run({ file, storyData, el }: ServerRunPayload) {
  const { default: Comp } = await import(/* @vite-ignore */ file.moduleId)

  const app = createApp({
    provide: {
      addStory(data) {
        storyData.push(data)
      },
      hstStoryFile: file,
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
    story: null,
    variant: null,
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
