import type { Plugin } from 'poveste'
import type { Page, WaitForOptions } from 'puppeteer'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { fetchPercyDOM, isPercyEnabled, postSnapshot } from '@percy/sdk-utils'
import { defu } from 'defu'
import path from 'pathe'
import { loadPuppeteer } from './puppeteer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

/**
 * Percy Snapshot Options
 * Not official type, just for reference
 * @see https://www.browserstack.com/docs/percy/take-percy-snapshots/snapshots-via-scripts
 */
export interface PercySnapshotOptions {
  widths?: number[]
  minHeight?: number
  percyCSS?: string
  enableJavaScript?: boolean
  discovery?: Partial<{
    allowedHostnames: string[]
    disallowedHostnames: string[]
    requestHeaders: Record<string, string>
    authorization: Partial<{
      username: string
      password: string
    }>
    disableCache: boolean
    userAgent: string
  }>
}

export interface PagePayload {
  file: string
  story: { title: string }
  variant: { id: string, title: string }
}

type ContructorOption<T extends object | number>
  = | T
    | ((payload: PagePayload) => T)

export interface PercyPluginOptions {
  /**
   * Ignored stories.
   */
  ignored?: (payload: PagePayload) => boolean
  /**
   * Percy options.
   */
  percyOptions?: ContructorOption<PercySnapshotOptions>

  /**
   * Delay puppeteer page screenshot after page load
   */
  pptrWait?: ContructorOption<number>

  /**
   * Navigation Parameter
   */
  pptrOptions?: ContructorOption<
    WaitForOptions & {
      referer?: string
    }
  >

  /**
   * Before taking a snapshot, you can modify the page
   * It happens after the page is loaded and wait (if pptrWait is passed) and before the snapshot is taken
   *
   * @param page Puppeteer page
   * @returns Promise<void | boolean> - If it returns false, the snapshot will be skipped
   */
  beforeSnapshot?: (
    page: Page,
    payload: PagePayload,
  ) => Promise<void | boolean>
}

/**
 * How to wait for the sandbox before serialising it.
 *
 * Puppeteer's own default is `load`, which fires once the document and its
 * subresources are in — before the sandbox has mounted the story. So
 * `PercyDOM.serialize` ran against the shell and every snapshot posted to Percy
 * was an empty page: two comment placeholders where the story should be (#352).
 *
 * That failure is invisible by construction, which is why it survived. Uniformly
 * blank snapshots make a stable baseline and zero diffs, and a blank baseline
 * never fails — it reads exactly like "no visual changes".
 *
 * `networkidle0` is enough on its own and adds no fixed sleep, so `pptrWait`
 * stays a user-tunable extra at 0. `@poveste/plugin-screenshot` was never
 * affected because `capture-website` waits for network idle already, so the two
 * plugins doing the same job now agree.
 */
export const NAVIGATION: WaitForOptions = { waitUntil: 'networkidle0' }

const defaultOptions: PercyPluginOptions = {
  percyOptions: {},
  pptrWait: 0,
  pptrOptions: {},
}

function resolveOptions<T extends object | number>(
  option: ContructorOption<T>,
  payload: PagePayload,
): T {
  return typeof option === 'function' ? option(payload) : option
}

/**
 * The navigation options a snapshot actually uses.
 *
 * Applied here rather than left to `defu` against `defaultOptions`, because
 * `pptrOptions` may be a function of the payload and `defu` cannot merge into
 * what a function will return — so the callback form would navigate on
 * puppeteer's `load` default and snapshot the shell, which is the whole of
 * #352. Anything the caller sets still wins, including `waitUntil`.
 */
export function navigationOptions(
  option: PercyPluginOptions['pptrOptions'],
  payload: PagePayload,
): WaitForOptions & { referer?: string } {
  return { ...NAVIGATION, ...(option === undefined ? {} : resolveOptions(option, payload)) }
}

export function HstPercy(options: PercyPluginOptions = {}): Plugin {
  const finalOptions: PercyPluginOptions = defu(options, defaultOptions)
  return {
    name: '@poveste/plugin-percy',

    onBuild: async (api) => {
      if (!(await isPercyEnabled())) {
        return
      }

      const { puppeteer, environmentInfo } = await loadPuppeteer()
      const browser = await puppeteer.launch()

      const sdkPkg = require(path.join(__dirname, '../package.json'))
      const CLIENT_INFO = `${sdkPkg.name}/${sdkPkg.version}`

      api.onPreviewStory(async ({ file, story, variant, url }) => {
        const payload = {
          file,
          story: {
            title: story.title,
          },
          variant: {
            id: variant.id,
            title: variant.title,
          },
        }

        if (finalOptions.ignored?.(payload)) {
          return
        }

        const pptrOptions = navigationOptions(finalOptions.pptrOptions, payload)
        const pptrWait = resolveOptions(finalOptions.pptrWait, payload)
        const percyOptions = resolveOptions(finalOptions.percyOptions, payload)

        const page = await browser.newPage()
        await page.goto(url, pptrOptions)

        await new Promise(resolve => setTimeout(resolve, pptrWait))

        if (finalOptions.beforeSnapshot) {
          const result = await finalOptions.beforeSnapshot(page, payload)
          if (result === false) {
            return
          }
        }

        const name = `${story.title} > ${variant.title}`
        await page.evaluate(await fetchPercyDOM())
        const domSnapshot = await page.evaluate((opts) => {
          // @ts-expect-error window global var
          return window.PercyDOM.serialize(opts)
        }, percyOptions)
        await postSnapshot({
          ...percyOptions,
          environmentInfo,
          clientInfo: CLIENT_INFO,
          url: page.url(),
          domSnapshot,
          name,
        })
      })

      api.onBuildEnd(async () => {
        await browser.close()
      })
    },
  }
}
