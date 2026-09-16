import type { ViteDevServer } from 'vite'
import type { FetchResult } from 'vite/module-runner'
import { existsSync, promises as fs } from 'node:fs'
import { builtinModules } from 'node:module'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { init as initLexer, parse as parseModule } from 'es-module-lexer'
import { dirname, extname, join, relative, resolve } from 'pathe'

/*
 * The server half of story collection: what vite-node's `ViteNodeServer` did,
 * answering a `ModuleRunner` in each worker (#167).
 *
 * Vite's own `fetchModule` is not enough for this. It externalises every bare
 * import, and it transforms every module one way, while collection needs both of
 * what vite-node gave it: an inline list, so `poveste`'s own `virtual:` imports
 * are transformed rather than handed to Node, which cannot load them in a fresh
 * install; and a transform per file, so a `.vue` or `.svelte` component compiles
 * for the DOM the collector mounts it in while its `.ts` compiles for Node.
 */

export type TransformMode = 'ssr' | 'web'

export interface ModuleServerOptions {
  inline: (string | RegExp)[]
  transformMode?: {
    ssr?: RegExp[]
    web?: RegExp[]
  }
}

const isWindows = process.platform === 'win32'

const DEFAULT_INLINE = [
  /virtual:/,
  /\.[mc]?ts$/,
  /[?&](?:init|raw|url|inline)\b/,
  /\.(?:apng|bmp|png|jpe?g|jfif|pjpeg|pjp|gif|svg|ico|webp|avif|mp4|webm|ogg|mp3|wav|flac|aac|woff2?|eot|ttf|otf|webmanifest|pdf|txt)$/,
]
const DEPS_EXTERNAL = [/\/node_modules\/.*\.cjs\.js$/, /\/node_modules\/.*\.mjs$/]
const MODULE_DIRECTORIES = ['/node_modules/']
const ESM_EXT_RE = /\.(?:es|esm|esm-browser|esm-bundler|es6|module)\.js$/
const ESM_FOLDER_RE = /\/(?:es|esm)\/(.*\.js)$/

// A dev-only import the chrome's HMR code reaches. Nothing hot-reloads inside a
// collection worker, so every function is a no-op.
const CLIENT_STUB = `
const noop = () => {}
__vite_ssr_exportName__('injectQuery', () => id => id)
__vite_ssr_exportName__('createHotContext', () => () => ({ accept: noop, prune: noop, dispose: noop, decline: noop, invalidate: noop, on: noop, send: noop }))
__vite_ssr_exportName__('updateStyle', () => noop)
__vite_ssr_exportName__('removeStyle', () => noop)
`

const builtins = new Set(builtinModules)

function isNodeBuiltin(id: string) {
  return id.startsWith('node:') || builtins.has(id)
}

function slash(path: string) {
  return path.replace(/\\/g, '/')
}

function withTrailingSlash(path: string) {
  return path.endsWith('/') ? path : `${path}/`
}

function cleanUrl(url: string) {
  return url.replace(/[?#].*$/, '')
}

function isInternalRequest(id: string) {
  return /^\/?@vite\/(?:client|env)$/.test(id)
}

/** A request id as the transformed code wrote it, back to a module id. */
function normalizeRequestId(id: string, base?: string) {
  if (base && base !== '/' && id.startsWith(withTrailingSlash(base))) {
    id = `/${id.slice(base.length)}`
  }
  if (id.startsWith('file://')) {
    const file = cleanUrl(id)
    return fileURLToPath(file) + id.slice(file.length)
  }
  return id
    .replace(/^\/@id\/__x00__/, '\0')
    .replace(/^\/@id\//, '')
    .replace(/^__vite-browser-external:/, '')
    .replace(/\?v=\w+/, '?')
    .replace(/&v=\w+/, '')
    .replace(/\?t=\w+/, '?')
    .replace(/&t=\w+/, '')
    .replace(/\?import/, '?')
    .replace(/&import/, '')
    .replace(/\?&/, '?')
    .replace(/\?+$/, '')
}

function normalizeModuleId(id: string) {
  if (id.startsWith('file://')) {
    return fileURLToPath(id)
  }
  return slash(id).replace(/^\/@fs\//, isWindows ? '' : '/').replace(/^\/+/, '/')
}

function toFilePath(id: string, root: string): { path: string, exists: boolean } {
  let absolute = id
  let exists = false
  if (id.startsWith('/@fs/')) {
    absolute = id.slice(4)
    exists = true
  }
  else if (!id.startsWith(withTrailingSlash(root)) && id.startsWith('/')) {
    const resolved = resolve(root, id.slice(1))
    if (existsSync(cleanUrl(resolved))) {
      absolute = resolved
      exists = true
    }
  }
  else if (id.startsWith(withTrailingSlash(root)) && existsSync(cleanUrl(id))) {
    exists = true
  }
  if (absolute.startsWith('//')) {
    absolute = absolute.slice(1)
  }
  return {
    path: isWindows && absolute.startsWith('/') ? slash(fileURLToPath(pathToFileURL(absolute.slice(1)).href)) : absolute,
    exists,
  }
}

function matches(id: string, patterns: (string | RegExp)[] | undefined) {
  return (patterns ?? []).some(pattern => typeof pattern === 'string'
    ? MODULE_DIRECTORIES.some(dir => id.includes(join(dir, pattern)))
    : pattern.test(id))
}

function guessCJSVersion(id: string) {
  const candidates = ESM_EXT_RE.test(id)
    ? ['.mjs', '.umd.js', '.cjs.js', '.js'].map(ext => id.replace(ESM_EXT_RE, ext))
    : ESM_FOLDER_RE.test(id)
      ? ['/umd/$1', '/cjs/$1', '/lib/$1', '/$1'].map(folder => id.replace(ESM_FOLDER_RE, folder))
      : []
  return candidates.find(candidate => existsSync(candidate))
}

async function nearestPackageType(dir: string): Promise<string | undefined> {
  while (true) {
    const manifest = await fs.readFile(join(dir, 'package.json'), 'utf8').catch(() => undefined)
    if (manifest) {
      return JSON.parse(manifest).type
    }
    const parent = dirname(dir)
    if (parent === dir) {
      return undefined
    }
    dir = parent
  }
}

// Whether Node can load this file natively: `.mjs`/`.cjs`, a `type: module`
// package, or a `.js` with no ESM syntax outside one.
async function isValidNodeImport(id: string) {
  const extension = extname(id)
  if (['.mjs', '.cjs', '.node', '.wasm'].includes(extension)) {
    return true
  }
  if (extension !== '.js') {
    return false
  }
  if (await nearestPackageType(dirname(id)) === 'module') {
    return true
  }
  if (/\.(?:\w+-)?esm?(?:-\w+)?\.js$|\/esm?\//.test(id)) {
    return false
  }
  try {
    await initLexer
    const [, , , hasModuleSyntax] = parseModule(await fs.readFile(id, 'utf8'))
    return !hasModuleSyntax
  }
  catch {
    return false
  }
}

export interface ModuleServer {
  invoke: (name: string, data: unknown[]) => Promise<unknown>
  clearCache: () => void
}

export function createModuleServer(server: ViteDevServer, options: ModuleServerOptions): ModuleServer {
  const root = server.config.root
  const cacheDir = relative(root, server.config.cacheDir)
  const noExternal = server.config.ssr?.noExternal
  const inline: (string | RegExp)[] | true = noExternal === true
    ? true
    : [...options.inline, ...(Array.isArray(noExternal) ? noExternal : noExternal ? [noExternal] : [])]

  const externalizeCache = new Map<string, Promise<string | false>>()
  const fetchCache = new Map<string, { timestamp: number, result: FetchResult }>()

  function getTransformMode(id: string): TransformMode {
    const path = cleanUrl(id)
    if (options.transformMode?.web?.some(pattern => pattern.test(path))) {
      return 'web'
    }
    if (options.transformMode?.ssr?.some(pattern => pattern.test(path))) {
      return 'ssr'
    }
    return /\.(?:[cm]?[jt]sx?|json)$/.test(path) ? 'ssr' : 'web'
  }

  async function computeExternalize(id: string): Promise<string | false> {
    if (isNodeBuiltin(id) || id.startsWith('data:') || /^(?:https?:)?\/\//.test(id)) {
      return id
    }
    if (inline === true || matches(id, inline)) {
      return false
    }
    if (cacheDir && id.includes(cacheDir)) {
      return id
    }
    const isLibrary = MODULE_DIRECTORIES.some(dir => id.includes(dir))
    const candidate = isLibrary ? guessCJSVersion(id) ?? id : id
    if (matches(candidate, DEFAULT_INLINE)) {
      return false
    }
    if (matches(candidate, DEPS_EXTERNAL)) {
      return candidate
    }
    if (isLibrary && await isValidNodeImport(candidate)) {
      return candidate
    }
    return false
  }

  function shouldExternalize(id: string) {
    if (!externalizeCache.has(id)) {
      externalizeCache.set(id, computeExternalize(id))
    }
    return externalizeCache.get(id)!
  }

  async function resolveRequest(url: string, importer: string | undefined) {
    const request = normalizeRequestId(url, server.config.base)
    if (isInternalRequest(request) || isNodeBuiltin(request) || request.startsWith('data:')) {
      return request
    }
    if (toFilePath(request, root).exists || !importer) {
      return request
    }
    const resolved = await server.pluginContainer.resolveId(request, importer, { ssr: getTransformMode(importer) === 'ssr' })
    return resolved ? normalizeRequestId(resolved.id, server.config.base) : request
  }

  async function transform(id: string, mode: TransformMode) {
    if (mode === 'web') {
      const result = await server.transformRequest(id)
      return result ? server.ssrTransform(result.code, result.map, id) : null
    }
    return server.transformRequest(id, { ssr: true })
  }

  async function fetchModule(url: string, importer?: string, cachedByRunner = false): Promise<FetchResult> {
    const request = await resolveRequest(url, importer)

    if (/^\/?@vite\/client$/.test(request)) {
      return { code: CLIENT_STUB, file: null, id: '/@vite/client', url: '/@vite/client', invalidate: false }
    }

    const id = normalizeModuleId(request)
    const { path } = toFilePath(id, root)

    const externalize = await shouldExternalize(path)
    if (externalize) {
      const external = isNodeBuiltin(externalize) || /^(?:data|https?):/.test(externalize)
        ? externalize
        : pathToFileURL(externalize).href
      return { externalize: external, type: isNodeBuiltin(externalize) ? 'builtin' : 'module' }
    }

    const moduleNode = server.moduleGraph.getModuleById(id) ?? [...server.moduleGraph.getModulesByFile(path) ?? []][0]
    const invalidatedAt = moduleNode ? Math.max(moduleNode.lastHMRTimestamp, moduleNode.lastInvalidationTimestamp) : 0
    const cached = fetchCache.get(path)
    if (cached && (invalidatedAt === 0 || cached.timestamp >= invalidatedAt)) {
      // Unchanged since the runner last read it: it keeps what it has. A runner
      // that never had it gets the code, with nothing of its own to invalidate.
      return cachedByRunner ? { cache: true } : { ...cached.result, invalidate: false }
    }

    const timestamp = Date.now()
    const result = await transform(id, getTransformMode(id))
    if (!result) {
      throw new Error(`[poveste] could not transform ${id}${importer ? `, imported from ${importer}` : ''}`)
    }
    const fetched: FetchResult = {
      code: result.code,
      file: existsSync(cleanUrl(path)) ? cleanUrl(path) : null,
      id,
      url: id,
      invalidate: true,
    }
    fetchCache.set(path, { timestamp, result: fetched })
    return fetched
  }

  /** The two calls a `ModuleRunner` makes, as its transport's `invoke` carries them. */
  async function invoke(name: string, data: unknown[]) {
    if (name === 'getBuiltins') {
      return [{ type: 'regexp', source: '^node:', flags: '' }, ...[...builtins].map(value => ({ type: 'string', value }))]
    }
    if (name === 'fetchModule') {
      const [url, importer, options] = data as [string, string | undefined, { cached?: boolean } | undefined]
      return fetchModule(url, importer, options?.cached)
    }
    throw new Error(`[poveste] a collection worker asked for ${name}, which this server does not answer`)
  }

  function clearCache() {
    fetchCache.clear()
  }

  return {
    invoke,
    clearCache,
  }
}
