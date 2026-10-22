import postcssrc from 'postcss-load-config'
import { normalizePath, searchForWorkspaceRoot } from 'vite'

// What PostCSS hands a plugin, as far as this file reads it; `postcss` is the book's, not a dependency.
interface Result { opts: { from?: string } }
type Legacy = (root: unknown, result: Result) => unknown
type AcceptedPlugin = object | Legacy
interface PostcssPlugin { postcssPlugin: string, prepare?: (result: Result) => object, Once?: (root: unknown, helpers: { result: Result }) => unknown }
type PostcssConfig = Record<string, unknown> & { plugins?: AcceptedPlugin[] }

/**
 * One of the book's PostCSS plugins, made to leave alone the files `skip` names. A pack
 * (`{ plugins: [...] }`, as Tailwind 3 is) is unwrapped, and a legacy function plugin
 * runs as a `Once` listener.
 */
function leaving(plugin: unknown, skip: (file: string | undefined) => boolean): AcceptedPlugin[] {
  let current = plugin as { postcss?: unknown, plugins?: unknown[], postcssPlugin?: string, prepare?: (result: Result) => object } | Legacy | undefined
  if (typeof current === 'function' && (current as { postcss?: unknown }).postcss === true) {
    current = (current as () => typeof current)()
  }
  else if (current && typeof (current as { postcss?: unknown }).postcss === 'function') {
    current = (current as { postcss: Legacy }).postcss
  }
  if (current && typeof current === 'object' && Array.isArray(current.plugins)) {
    return current.plugins.flatMap(inner => leaving(inner, skip))
  }
  if (typeof current === 'function') {
    const legacy = current
    return [{ postcssPlugin: legacy.name || 'postcss-legacy-plugin', Once: (root, { result }) => skip(result.opts.from) ? undefined : legacy(root, result) } as PostcssPlugin]
  }
  if (current && typeof current === 'object' && current.postcssPlugin) {
    const { postcssPlugin, prepare, ...listeners } = current
    return [{ postcssPlugin, prepare: result => skip(result.opts.from) ? {} : { ...listeners, ...prepare?.(result) } } as PostcssPlugin]
  }
  return [current as AcceptedPlugin]
}

/**
 * The book's PostCSS config, with every plugin kept off the chrome's own stylesheets:
 * they are already compiled, and a book's plugins can reject them. Tailwind 3 refused the
 * chrome's `@layer utilities`, and `poveste build` failed (#1433). Nothing when the book
 * has no PostCSS config, so Vite goes on looking for none.
 */
export async function postcssOffChrome(root: string, given: unknown, chromeDir: string): Promise<PostcssConfig | undefined> {
  const chrome = `${normalizePath(chromeDir)}/`
  const skip = (file: string | undefined) => file !== undefined && normalizePath(file.split('?')[0]!).startsWith(chrome)
  if (given && typeof given === 'object') {
    const inline = given as PostcssConfig
    return { ...inline, plugins: (inline.plugins ?? []).flatMap(plugin => leaving(plugin, skip)) }
  }
  let loaded: Awaited<ReturnType<typeof postcssrc>>
  try {
    // Where Vite stops looking, so a config above the project is not picked up here alone.
    loaded = await postcssrc({}, typeof given === 'string' ? given : root, { stopDir: searchForWorkspaceRoot(root) })
  }
  catch (error) {
    if (/No PostCSS Config found/.test((error as Error).message)) {
      return undefined
    }
    throw error
  }
  return { ...loaded.options, plugins: loaded.plugins.flatMap(plugin => leaving(plugin, skip)) }
}
