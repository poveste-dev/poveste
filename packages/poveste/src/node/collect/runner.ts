import type { EvaluatedModuleNode, ModuleEvaluator, ModuleRunnerContext, ModuleRunnerImportMeta } from 'vite/module-runner'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join } from 'node:path'
import process from 'node:process'
import {
  createDefaultImportMeta,
  ESModulesEvaluator,
  EvaluatedModules,
  ModuleRunner,
  ssrDynamicImportKey,
  ssrExportAllKey,
  ssrExportNameKey,
  ssrImportKey,
  ssrImportMetaKey,
  ssrModuleExportsKey,
} from 'vite/module-runner'

export type Invoke = (name: string, data: unknown[]) => Promise<unknown>

const AsyncFunction = (async () => {}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<void>

function isPrimitive(value: unknown) {
  return value !== Object(value)
}

function exportAll(exports: Record<string, unknown>, source: any) {
  if (exports === source || isPrimitive(source) || Array.isArray(source) || source instanceof Promise) {
    return
  }
  for (const key in source) {
    if (key !== 'default' && !(key in exports)) {
      try {
        Object.defineProperty(exports, key, { enumerable: true, configurable: true, get: () => source[key] })
      }
      catch {}
    }
  }
}

/**
 * The file a CJS module should believe it is, for `require`, `__filename` and
 * `__dirname`.
 *
 * `module.id` is a Vite id and is root-relative — `/node_modules/vue/index.js`
 * is a real id and not a path that exists. `isAbsolute()` answers "does this
 * start with a separator", which that satisfies, so an id used to become a
 * `filename` and the module's own `require('./dist/…')` resolved against a
 * directory under the filesystem root. Quasar's config pulls `vue` through here,
 * and a Quasar book could not collect a story at all (#1048).
 *
 * `module.file` is Vite's resolved path and is the only trustworthy source. An
 * absolute-looking id is accepted only if it names something — one `existsSync`
 * against evaluating a module, and it is the question the old predicate meant to
 * ask.
 */
export function filenameOf(module: Readonly<EvaluatedModuleNode>): string {
  for (const candidate of [module.file, module.id]) {
    if (candidate === undefined) {
      continue
    }

    const path = candidate.replace(/[?#].*$/, '')
    if (!isAbsolute(path)) {
      continue
    }

    if (existsSync(path)) {
      return path
    }

    // Root-relative: `/node_modules/vue/index.js` is an id under the project
    // root, not a path under the filesystem root.
    const rooted = join(process.cwd(), path)
    if (existsSync(rooted)) {
      return rooted
    }
  }

  return join(process.cwd(), 'virtual-module')
}

/** As vite-node did: a CJS package's named exports are read through its default. */
class InteropEvaluator implements ModuleEvaluator {
  // The runner offsets source maps by the lines a wrapper adds, which match Vite's own.
  startOffset = new ESModulesEvaluator().startOffset

  /**
   * Vite's own evaluator passes only import bindings, so a CJS dependency inlined
   * through `viteNodeInlineDeps` threw `exports is not defined` (#167).
   */
  async runInlinedModule(context: ModuleRunnerContext, code: string, module: Readonly<EvaluatedModuleNode>) {
    const exports = context[ssrModuleExportsKey] as Record<string, any>
    // Identity, not a location: only `.mjs` is read off it, below.
    const path = (module.file || module.id).replace(/[?#].*$/, '')
    const filename = filenameOf(module)

    let assignedExports: unknown
    let assigned = false
    const cjsExports: Record<string, any> = new Proxy(exports, {
      get: (target, prop, receiver) => Reflect.has(target, prop) ? Reflect.get(target, prop, receiver) : Reflect.get(Object.prototype, prop, receiver),
      getPrototypeOf: () => Object.prototype,
      set: (_, prop, value) => {
        if (prop === 'default' && !path.endsWith('.mjs') && cjsExports !== value) {
          exportAll(cjsExports, value)
          exports['default'] = value
          return true
        }
        if (!Reflect.has(exports, 'default')) {
          exports['default'] = {}
        }
        if (assigned && isPrimitive(assignedExports)) {
          Object.defineProperty(exports, prop, { enumerable: true, configurable: true, get: () => undefined })
          return true
        }
        if (!isPrimitive(exports['default'])) {
          exports['default'][prop] = value
        }
        if (prop !== 'default') {
          Object.defineProperty(exports, prop, { enumerable: true, configurable: true, get: () => value })
        }
        return true
      },
    })
    const moduleProxy = {
      get exports() {
        return cjsExports
      },
      set exports(value) {
        exportAll(cjsExports, value)
        exports['default'] = value
        assignedExports = value
        assigned = true
      },
    }

    const run = new AsyncFunction(ssrModuleExportsKey, ssrImportMetaKey, ssrImportKey, ssrDynamicImportKey, ssrExportAllKey, ssrExportNameKey, 'require', 'exports', 'module', '__filename', '__dirname', `"use strict";\n${code}`)
    await run(context[ssrModuleExportsKey], context[ssrImportMetaKey], context[ssrImportKey], context[ssrDynamicImportKey], context[ssrExportAllKey], context[ssrExportNameKey], createRequire(filename), cjsExports, moduleProxy, filename, dirname(filename))
  }

  async runExternalModule(file: string) {
    const imported = await import(file)
    if (file.endsWith('.mjs') || !('default' in imported)) {
      return imported
    }
    let mod = imported
    let defaultExport = imported.default
    if (!isPrimitive(defaultExport) && '__esModule' in defaultExport) {
      mod = defaultExport
      if ('default' in defaultExport) {
        defaultExport = defaultExport.default
      }
    }
    return new Proxy(mod, {
      get: (target, prop) => prop === 'default' ? defaultExport : target[prop] ?? defaultExport?.[prop],
      has: (target, prop) => prop === 'default' ? defaultExport !== undefined : prop in target || (!isPrimitive(defaultExport) && prop in defaultExport),
      getOwnPropertyDescriptor: (target, prop) => Reflect.getOwnPropertyDescriptor(target, prop)
        ?? (prop === 'default' && defaultExport !== undefined ? { value: defaultExport, enumerable: true, configurable: true } : undefined),
    })
  }
}

// The runner's own default throws on any key the transform did not replace.
const env = new Proxy(process.env, {
  get: (target, key) => typeof key !== 'string'
    ? undefined
    : ['DEV', 'PROD', 'SSR'].includes(key) ? !!target[key] : target[key],
}) as unknown as ModuleRunnerImportMeta['env']

/** A runner over a module server, reached through `invoke`. */
export function createRunner(invoke: Invoke, evaluatedModules = new EvaluatedModules()): ModuleRunner {
  return new ModuleRunner({
    transport: {
      async invoke(message: any) {
        try {
          return { result: await invoke(message.data.name, message.data.data) }
        }
        catch (error) {
          return { error }
        }
      },
    },
    hmr: false,
    sourcemapInterceptor: false,
    evaluatedModules,
    createImportMeta: modulePath => ({ ...createDefaultImportMeta(modulePath), env }),
  }, new InteropEvaluator())
}
