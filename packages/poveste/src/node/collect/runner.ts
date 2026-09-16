import type { ModuleRunnerImportMeta } from 'vite/module-runner'
import process from 'node:process'
import { createDefaultImportMeta, ESModulesEvaluator, EvaluatedModules, ModuleRunner } from 'vite/module-runner'

export type Invoke = (name: string, data: unknown[]) => Promise<unknown>

function isPrimitive(value: unknown) {
  return value !== Object(value)
}

/**
 * Loads an externalised dependency the way vite-node did, which collection has
 * always relied on: a CommonJS package's named exports are read through its
 * default export, so `import { x } from 'cjs-package'` works whether or not Node's
 * lexer found `x`.
 */
class InteropEvaluator extends ESModulesEvaluator {
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

// `import.meta.env` as vite-node gave it: `process.env`, with the three flags as
// booleans. The runner's default throws on any key the transform did not replace.
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
