import type { Plugin as VitePlugin } from 'vite'
import { CONTROLS_SLOT, GLOBAL_LAYER_QUERY, STORY_SCOPE_ROOT } from './selectors.js'
import { wrapUserCss } from './transforms.js'

export const USER_CSS_MARK_START = '/*__PVT_USER_CSS_START__*/'
export const USER_CSS_MARK_END = '/*__PVT_USER_CSS_END__*/'

export interface UserCssScopePluginOptions {
  enabled: boolean
  /**
   * 'mark' — insert sentinel comments; entry-css-merger wraps per-entry at
   * build time. 'wrap' — wrap directly in @scope at transform time (dev,
   * no merger).
   */
  mode?: 'mark' | 'wrap'
  /** Filled in 'wrap' mode with each sheet as it was before wrapping, for `sandboxCssPlugin`. */
  sources?: Map<string, string>
}

export function userCssScopePlugin(opts: UserCssScopePluginOptions): VitePlugin {
  const mode = opts.mode ?? 'mark'
  return {
    name: 'poveste:style-isolation:user-css',
    transform(code, id) {
      if (!opts.enabled) return null
      const q = id.indexOf('?')
      const path = q === -1 ? id : id.slice(0, q)
      const query = q === -1 ? '' : id.slice(q + 1)
      // Cheap substring rejection of all poveste-internal CSS first.
      if (isChromePath(path)) return null
      if (!isCssPath(path, query)) return null
      if (hasGlobalQuery(query)) return null
      if (mode === 'wrap') {
        opts.sources?.set(id, code)
        return { code: wrapUserCss(code, { scopeRoot: STORY_SCOPE_ROOT, excludeRootClass: CONTROLS_SLOT.slice(1) }), map: null }
      }
      return {
        code: `${USER_CSS_MARK_START}\n${code}\n${USER_CSS_MARK_END}\n`,
        map: null,
      }
    },
  }
}

/** Set by the dev sandbox page before any module runs. */
export const SANDBOX_FLAG = '__POVESTE_SANDBOX__'

// Vite's dev CSS module, one line: `const __vite__css = "<the sheet>"`.
const VITE_DEV_CSS_RE = /^const __vite__css = (".*")$/m

/**
 * A built book gives the sandbox iframe its own stylesheet, unwrapped: the iframe
 * is the story's document, so `:root` is the story's root (#1532). Dev serves one
 * module to the app and the iframe alike, so the sheet is picked where it runs.
 * A module in any other shape keeps the wrapped sheet.
 */
export function sandboxCssPlugin(sources: Map<string, string>): VitePlugin {
  return {
    name: 'poveste:style-isolation:sandbox-css',
    enforce: 'post',
    transform(code, id) {
      const source = sources.get(id)
      const declaration = source === undefined ? null : VITE_DEV_CSS_RE.exec(code)
      if (!declaration) return null
      return {
        code: code.replace(declaration[0], () => `const __vite__css = globalThis.${SANDBOX_FLAG} ? ${JSON.stringify(source)} : ${declaration[1]}`),
        map: null,
      }
    },
  }
}

const CSS_EXT_RE = /\.(?:css|pcss|postcss|scss|sass|less|styl|stylus)$/
// Vue / Svelte / Vite virtual style modules carry the source extension as a
// `lang.<ext>` query, e.g. `Foo.vue?vue&type=style&index=0&lang.css`.
const CSS_LANG_QUERY_RE = /(?:^|&)lang\.(?:css|pcss|postcss|scss|sass|less|styl|stylus)(?:&|$)/

function isCssPath(path: string, query: string): boolean {
  return CSS_EXT_RE.test(path) || CSS_LANG_QUERY_RE.test(query)
}

function hasGlobalQuery(query: string): boolean {
  if (!query) return false
  const parts = query.split('&')
  // `?global` is the per-import escape hatch; the `globalStyles` config marks
  // its files with `?poveste-global-layer` and they get a cascade layer of
  // their own in global-styles.ts.
  return parts.includes('global')
    || parts.some(p => p.startsWith('global='))
    || parts.includes(GLOBAL_LAYER_QUERY)
}

export function isChromeCss(id: string): boolean {
  const q = id.indexOf('?')
  return isChromePath(q === -1 ? id : id.slice(0, q))
}

function isChromePath(path: string): boolean {
  return path.includes('@poveste/app/')
    || path.includes('poveste-app/')
    || path.includes('@poveste/controls/')
    || path.includes('poveste-controls/')
    || path.includes('@poveste/vendors/')
    || path.includes('poveste-vendors/')
    || path.includes('virtual:$poveste-')
}
