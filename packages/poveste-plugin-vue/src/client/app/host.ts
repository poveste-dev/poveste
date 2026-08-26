import type { Story, Variant } from '@poveste/shared'
import type { App, Component, PropType, VNode } from 'vue'
import type { Vue3StorySetupApi, Vue3StorySetupHandler } from '../../helpers.js'
import type { PreviewRenderContext } from './render-context.js'
import { getSetupHook, reportStoryError } from '@poveste/shared'
// @ts-expect-error virtual module id
import * as generatedSetup from 'virtual:$poveste-generated-global-setup'
// @ts-expect-error virtual module id
import * as setup from 'virtual:$poveste-setup'
import {
  createApp,
  defineComponent,
  h,
  Suspense,
} from 'vue'
import { VUE_SETUP_HOOK_NAMES } from '../../setup-hooks.js'
import { registerGlobalComponents } from './global-components.js'
import { provideRenderContext } from './render-context.js'
import { RouterLinkStub } from './RouterLinkStub.js'

interface PreviewHostOptions {
  name: string
  el: HTMLElement
  getStory: () => Story
  getVariant: () => Variant | null
  renderContext: PreviewRenderContext
  wrapInDiv?: boolean
}

const PreviewHostRoot = defineComponent({
  name: 'PreviewHostRoot',

  props: {
    story: {
      type: Object as PropType<Story>,
      required: true,
    },

    renderContext: {
      type: Object as PropType<PreviewRenderContext>,
      required: true,
    },
  },

  setup(props) {
    provideRenderContext(props.renderContext)

    return () => h(props.story.file.component, {
      story: props.story,
    })
  },
})

export function createPreviewHost(options: PreviewHostOptions) {
  let app: App = null
  let target: HTMLDivElement = null

  async function mount() {
    const wrappers: Component[] = []

    target = document.createElement('div')
    options.el.appendChild(target)

    app = createApp({
      name: options.name,

      render: () => {
        let vnode: VNode = h(PreviewHostRoot, {
          story: options.getStory(),
          renderContext: options.renderContext,
        })

        for (const wrapper of wrappers) {
          const child = vnode
          vnode = h(wrapper, {
            story: options.getStory(),
            variant: options.getVariant(),
          }, () => child)
        }

        if (options.wrapInDiv) {
          vnode = h('div', vnode)
        }

        return h(Suspense, {}, vnode)
      },
    })

    // Vue catches a throw from setup or render and logs it to `console.error`,
    // leaving the template on screen — so without this the host cannot tell a
    // broken story from a working one (#323).
    app.config.errorHandler = (err) => {
      reportStoryError(err, {
        storyId: options.getStory()?.id,
        variantId: options.getVariant()?.id,
      })
      console.error(err)
    }

    registerGlobalComponents(app)
    app.component('RouterLink', RouterLinkStub)

    const setupApi: Vue3StorySetupApi = {
      app,
      story: options.getStory(),
      variant: options.getVariant(),
      addWrapper: (wrapper) => {
        wrappers.unshift(wrapper)
      },
    }

    await runSetupHooks(setupApi)

    app.mount(target)
  }

  function unmount() {
    app?.unmount()
    app = null

    if (target) {
      target.parentNode?.removeChild(target)
      target = null
    }
  }

  function forceUpdate() {
    app?._instance?.proxy?.$forceUpdate()
  }

  return {
    mount,
    unmount,
    forceUpdate,
  }
}

async function runSetupHooks(setupApi: Vue3StorySetupApi) {
  const generatedSetupFn = getSetupHook<Vue3StorySetupHandler>(generatedSetup, VUE_SETUP_HOOK_NAMES)
  if (generatedSetupFn) {
    await generatedSetupFn(setupApi)
  }

  const setupFn = getSetupHook<Vue3StorySetupHandler>(setup, VUE_SETUP_HOOK_NAMES)
  if (setupFn) {
    await setupFn(setupApi)
  }

  if (typeof setupApi.variant?.setupApp === 'function') {
    const variantSetupFn = setupApi.variant.setupApp as Vue3StorySetupHandler
    await variantSetupFn(setupApi)
  }
}
