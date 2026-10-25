import type { ServerStory, ServerStoryFile, Story, StoryFile, Variant } from '@poveste/shared'
import type { App, Component } from 'vue'
import type { PreviewRenderContext } from '../client/app/render-context.js'
// @ts-expect-error virtual module id
import { environmentApp, environmentReady } from 'virtual:$poveste-testing-environment'
import { describe, it } from 'vitest'
import { markRaw, nextTick, reactive } from 'vue'
import { registerControlComponents } from '../client/app/global-components.js'
import { createPreviewHost } from '../client/app/host.js'
import { syncStateBundledAndExternal } from '../client/app/util.js'
import { collectComponent } from '../client/server/collect.js'

export interface TestStoriesOptions {
  /** The outer `describe`'s name. The story file's name by default. */
  name?: string
  /**
   * How long a variant's setup may take to settle, in milliseconds: an
   * `initState` or an async `setup()` still pending then fails the test.
   */
  timeout?: number
}

type StoryComponent = Component & { __file?: string, doc?: string }

/**
 * Turns a story file into one test per variant. Each test renders the variant
 * the way the preview does, and fails on what the preview would only log: an
 * error from setup or render, a rejected `initState`, or a `[Vue warn]`.
 *
 * ```ts
 * import { testStories } from '@poveste/plugin-vue/testing'
 * import BaseButton from './BaseButton.story.vue'
 *
 * testStories(BaseButton)
 * ```
 */
export function testStories(component: StoryComponent, options: TestStoriesOptions = {}): void {
  const name = options.name ?? fileName(component.__file) ?? 'stories'
  const timeout = options.timeout ?? 5000

  describe(name, async () => {
    await environmentReady()
    const { stories, problems } = await collect(component, name)

    if (problems.length || !stories.length) {
      it('collects', () => {
        throw failure(`collecting ${name}`, problems.length ? problems : ['it has no <Story>'])
      })
      return
    }

    for (const story of stories) {
      describe(story.title, () => {
        for (const variant of story.variants) {
          it(variant.title, async () => {
            const found = await renderVariant(story, variant, timeout)
            if (found.length) {
              throw failure(`${story.title} › ${variant.title}`, found)
            }
          })
        }
      })
    }
  })
}

async function collect(component: StoryComponent, name: string) {
  const path = component.__file ?? name
  const base = fileName(path) ?? name
  const file = {
    id: name.replace(/\W+/g, '-').toLowerCase(),
    path,
    moduleId: path,
    // As poveste names it: what a `<Story>` with no `title` is called.
    fileName: base.includes('.') ? base.slice(0, base.indexOf('.')) : base,
  } as ServerStoryFile
  const storyData: ServerStory[] = []
  const problems: unknown[] = []
  const el = document.createElement('div')

  await collectComponent(component, { file, storyData, el }, (app) => {
    app.config.errorHandler = (err) => {
      problems.push(err)
    }
    app.config.warnHandler = (message, _instance, trace) => {
      problems.push(vueWarning(message, trace))
    }
    copyMissing(app._context.components, controlComponents())
    inheritEnvironmentApp(app)
  })

  const storyFile = {
    id: file.id,
    supportPluginId: 'vue3',
    component: markRaw(component),
    path: [],
    filePath: file.path,
    source: async () => ({ default: '' }),
  } as unknown as StoryFile

  const stories = storyData.map((data) => {
    const story: Story = {
      ...data,
      file: markRaw(storyFile),
      variants: data.variants.map(variant => toClientVariant(variant as unknown as Variant)),
      slots: () => ({}),
    } as Story
    storyFile.story = story
    return story
  })
  return { stories, problems }
}

function toClientVariant(variant: Variant): Variant {
  return {
    ...variant,
    state: reactive({
      _hPropState: {},
      _hPropDefs: {},
    }),
    setupApp: undefined,
    slots: () => ({}),
    previewReady: false,
  }
}

/**
 * The mount pass a sandbox runs, for the variant's `initState`, then the render
 * pass for its default slot: what the preview shows.
 */
async function renderVariant(story: Story, variant: Variant, timeout: number): Promise<unknown[]> {
  const found: unknown[] = []
  const onError = (err: unknown) => {
    found.push(err)
  }
  const onWarn = (message: string) => {
    found.push(message)
  }
  const el = document.createElement('div')
  document.body.appendChild(el)

  const mountHost = createPreviewHost({
    name: 'StoryTestMount',
    el,
    getStory: () => story,
    getVariant: () => null,
    renderContext: reactive({
      mode: 'mount',
      slotName: 'default',
      currentVariant: null,
      targetVariantId: variant.id,
      externalState: null,
      nextVariantIndex: { value: 0 },
    }) as PreviewRenderContext,
    onError,
    onWarn,
    configureApp: inheritEnvironmentApp,
  })

  const externalState = reactive<Variant['state']>({})
  const stateSync = syncStateBundledAndExternal(variant.state, externalState)
  const renderHost = createPreviewHost({
    name: 'StoryTestRender',
    el,
    getStory: () => story,
    getVariant: () => variant,
    renderContext: reactive({
      mode: 'render',
      slotName: 'default',
      currentVariant: variant,
      externalState,
      nextVariantIndex: { value: 0 },
    }) as PreviewRenderContext,
    wrapInDiv: true,
    onError,
    onWarn,
    configureApp: inheritEnvironmentApp,
  })

  try {
    await mountHost.mount()
    if (!await settled(() => !!variant.configReady || found.length > 0, timeout)) {
      found.push(new Error(`its setup did not settle within ${timeout} ms`))
    }
    if (!found.length) {
      await renderHost.mount()
      await settled(() => false, 0)
    }
  }
  catch (err) {
    found.push(err)
  }
  finally {
    renderHost.unmount()
    mountHost.unmount()
    stateSync.stop()
    el.remove()
  }

  return found
}

/**
 * Gives a story's app the context of the app the test environment boots, so the
 * story's `useNuxtApp()` and the plugins' injections resolve as in `poveste dev`.
 * What `@nuxt/test-utils`' own mounts copy.
 */
// The controls' globals, registered without the warning a second registration of
// a name the book's setup file already took would print.
function controlComponents(): Record<string, Component> {
  const registry: Record<string, Component> = {}
  registerControlComponents({ component: (name: string, component: Component) => {
    registry[name] = component
  } } as unknown as App)
  return registry
}

function inheritEnvironmentApp(app: App) {
  const host: App | undefined = environmentApp()
  if (!host) {
    return
  }
  copyMissing(app, host)
  copyMissing(app._context.provides, host._context.provides)
  copyMissing(app.config.globalProperties, host.config.globalProperties)
  copyMissing(app._context.components, host._context.components)
  copyMissing(app._context.directives, host._context.directives)
}

// By descriptor: Nuxt defines `$nuxt` and its injections as getters that aren't
// enumerable, so a spread or `Object.assign` leaves them behind.
function copyMissing(target: object, source: object) {
  for (const key of Reflect.ownKeys(source)) {
    if (!(key in target)) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)!)
    }
  }
}

async function settled(done: () => boolean, timeout: number): Promise<boolean> {
  const deadline = Date.now() + timeout
  do {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve))
    if (done()) {
      return true
    }
  } while (Date.now() < deadline)
  return done()
}

function failure(where: string, found: unknown[]): Error {
  const first = found[0]
  const lines = found.map(item => item instanceof Error ? (item.stack ?? item.message) : String(item))
  const error = new Error(`${where}: ${found.length === 1 ? 'one problem' : `${found.length} problems`}\n\n${lines.join('\n\n')}`)
  if (first instanceof Error) {
    error.cause = first
  }
  return error
}

function vueWarning(message: string, trace: string): string {
  return `[Vue warn]: ${message}${trace ? `\n${trace}` : ''}`
}

function fileName(path: string | undefined): string | undefined {
  return path?.split(/[\\/]/).pop()
}
