import type { Component } from '@poveste/vendors/vue'
import type { ServerRunPayload, ServerStory, ServerStoryFile, Story, StoryFile, Variant } from '../types/index.js'
import { createApp, h, markRaw, nextTick, reactive } from '@poveste/vendors/vue'
import { describe, it } from 'vitest'

/** What a framework plugin hands the story-test harness: how it collects, and its two hosts. */
export interface StoryTestFramework<C = unknown> {
  supportPluginId: string
  /** Collects the story file a test imported, as `poveste dev` collects it from disk. */
  collect: (component: C, payload: ServerRunPayload) => Promise<void>
  /** The app's mount pass, which applies `initState` and marks each variant ready. */
  MountStory: Component
  /** The app's render pass, which renders one variant and emits `ready`. */
  RenderStory: Component
  /**
   * The story the mount pass is given for one variant. A host that mounts every
   * variant, as the JSX ones do, is given a story of that variant alone, so one
   * variant's `initState` can't fail another's test.
   */
  narrow?: (story: Story, variant: Variant) => Story
}

export interface DescribeStoriesOptions {
  /** The outer `describe`'s name. */
  name: string
  /**
   * How long a variant's setup or render may take to settle, in milliseconds:
   * one still pending then fails the test.
   */
  timeout?: number | undefined
}

/**
 * One test per variant of a story file, each rendered by the framework's own
 * hosts the way the preview renders it. A test fails on what the preview would
 * only show or log: an error, a rejected `initState`, or anything the framework
 * or the story prints with `console.error` or `console.warn`, where Solid, React
 * and Svelte put both their errors and their development warnings.
 */
export function describeStories<C>(framework: StoryTestFramework<C>, component: C, options: DescribeStoriesOptions): void {
  const timeout = options.timeout ?? 5000

  describe(options.name, async () => {
    const { stories, problems } = await collect(framework, component, options.name)

    if (problems.length || !stories.length) {
      it('collects', () => {
        throw failure(`collecting ${options.name}`, problems.length ? problems : ['it has no story'])
      })
      return
    }

    for (const story of stories) {
      describe(story.title, () => {
        for (const variant of story.variants) {
          it(variant.title, async () => {
            const found = await renderVariant(framework, story, variant, timeout)
            if (found.length) {
              throw failure(`${story.title} › ${variant.title}`, found)
            }
          })
        }
      })
    }
  })
}

async function collect<C>(framework: StoryTestFramework<C>, component: C, name: string) {
  const id = name.replace(/\W+/g, '-').toLowerCase()
  const fileName = name.includes('.') ? name.slice(0, name.indexOf('.')) : name
  const file = { id, path: name, moduleId: name, fileName, supportPluginId: framework.supportPluginId } as ServerStoryFile
  const storyData: ServerStory[] = []
  const problems: unknown[] = []
  const el = document.createElement('div')

  const restore = captureConsole(problems)
  try {
    await framework.collect(component, { file, storyData, el } as ServerRunPayload)
  }
  catch (error) {
    // A setup file or a story module that throws, reported as the file's one failing test.
    problems.push(error)
  }
  finally {
    restore()
  }

  const storyFile = markRaw({
    id,
    supportPluginId: framework.supportPluginId,
    component: markRaw(component as object),
    path: [],
    filePath: name,
    source: async () => ({ default: '' }),
  }) as unknown as StoryFile

  const stories = storyData.map((data) => {
    const story = reactive({
      ...data,
      file: storyFile,
      variants: data.variants.map(variant => ({
        ...variant,
        state: { _hPropState: {}, _hPropDefs: {} },
        slots: () => ({}),
        previewReady: false,
      })),
    }) as unknown as Story
    storyFile.story = story
    return story
  })
  return { stories, problems }
}

/** The mount pass, for the variant's `initState`, then the render pass: what the preview shows. */
async function renderVariant(framework: StoryTestFramework<any>, story: Story, variant: Variant, timeout: number): Promise<unknown[]> {
  const found: unknown[] = []
  let ready = false
  const mountEl = document.body.appendChild(document.createElement('div'))
  const renderEl = document.body.appendChild(document.createElement('div'))
  const mounted = framework.narrow?.(story, variant) ?? story
  const mountApp = createApp({ render: () => h(framework.MountStory, { story: mounted, targetVariantId: variant.id }) })
  const renderApp = createApp({ render: () => h(framework.RenderStory, { story, variant, onReady: () => {
    ready = true
  } }) })
  for (const app of [mountApp, renderApp]) {
    app.config.errorHandler = (error) => {
      found.push(error)
    }
    app.config.warnHandler = (message, _instance, trace) => {
      found.push(`[Vue warn]: ${message}${trace ? `\n${trace}` : ''}`)
    }
  }

  const restore = captureConsole(found)
  let rendered = false
  try {
    mountApp.mount(mountEl)
    if (!await settled(() => !!variant.configReady || found.length > 0, timeout)) {
      found.push(new Error(`its setup did not settle within ${timeout} ms`))
    }
    if (!found.length) {
      renderApp.mount(renderEl)
      rendered = true
      if (!await settled(() => ready || found.length > 0, timeout)) {
        found.push(new Error(`its render did not settle within ${timeout} ms`))
      }
      // A framework runs its effects after the commit that marked the variant
      // ready; an error or warning from one belongs to this variant too.
      await settled(() => false, 0)
    }
  }
  catch (error) {
    found.push(error)
  }
  finally {
    if (rendered) {
      renderApp.unmount()
    }
    mountApp.unmount()
    restore()
    mountEl.remove()
    renderEl.remove()
  }

  return found
}

/** Takes what is printed as an error or a warning into `found`, until the returned function puts the console back. */
function captureConsole(found: unknown[]): () => void {
  const { error, warn } = console
  console.error = (...args: unknown[]) => {
    found.push(args.length === 1 && args[0] instanceof Error ? args[0] : args.map(printed).join(' '))
  }
  console.warn = (...args: unknown[]) => {
    found.push(args.map(printed).join(' '))
  }
  return () => {
    console.error = error
    console.warn = warn
  }
}

function printed(value: unknown): string {
  if (value instanceof Error) {
    return value.stack ?? value.message
  }
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value) ?? String(value)
  }
  catch {
    return String(value)
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
