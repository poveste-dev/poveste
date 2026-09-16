import type { ModuleLoader } from '@poveste/shared'
import type { ViteDevServer } from 'vite'
import { resolve } from 'pathe'
import pc from 'picocolors'
import { createModuleServer } from './collect/module-server.js'
import { createRunner } from './collect/runner.js'

export interface UseModuleLoaderOptions {
  server: ViteDevServer
  throws?: boolean
}

let _load: ModuleLoader['loadModule']

export function useModuleLoader(options: UseModuleLoaderOptions): ModuleLoader {
  const { server } = options

  const node = createModuleServer(server, { inline: [] })

  const runner = createRunner((name, data) => node.invoke(name, data))

  function clearCache() {
    server.moduleGraph.invalidateAll()
    node.clearCache()
    runner.evaluatedModules.clear()
  }

  async function loadModule(file: string) {
    try {
      const result = await runner.import(resolve(file))
      return result
    }
    catch (e) {
      console.error(pc.red(`Error while loading module ${file}:\n${e.frame ? `${pc.bold(e.message)}\n${e.frame}` : e.stack}`))
      if (options.throws) {
        throw e
      }
    }
  }

  _load = loadModule

  async function destroy() {
    // Noop
  }

  return {
    clearCache,
    loadModule,
    destroy,
  }
}

export const loadModule: ModuleLoader['loadModule'] = (...args) => _load?.(...args)
