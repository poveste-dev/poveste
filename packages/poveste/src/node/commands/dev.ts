import type { FSWatcher } from 'chokidar'
import chokidar from 'chokidar'
import pc from 'picocolors'
import { runPovesteCleanups } from '../cleanup.js'
import { resolveConfigFile } from '../config.js'
import { createContext } from '../context.js'
import { createServer } from '../server.js'
import { resolvePort } from './port.js'

export interface DevOptions {
  port?: number | string
  open?: boolean
  host?: string | boolean
  config?: string
}

export async function devCommand(options: DevOptions) {
  // Plugins open things while the config is resolved — before any hook here has
  // run — so the teardown has to span the command, not one phase of it (#434).
  try {
    const port = resolvePort(options.port, 'dev')

    let stop: () => Promise<void>

    async function start() {
      const ctx = await createContext({
        configFile: options.config,
        mode: 'dev',
      })
      const { server, viteConfigFile, close } = await createServer(ctx, {
        port,
        open: options.open,
        host: options.host,
      })
      server.printUrls()

      // Poveste config watcher
      let watcher: FSWatcher
      if (viteConfigFile) {
        watcher = chokidar.watch(viteConfigFile, {
          ignoreInitial: true,
        })
        watcher.on('change', () => {
          restart('Vite')
        })
      }

      return async () => {
        await watcher?.close()
        await close()
      }
    }

    async function restart(source: string) {
      if (stop) {
        console.log(pc.blue(`${source} config changed, restarting...`))
        await stop()
        stop = null // Don't call stop again until new start() is done
        stop = await start()
      }
    }

    stop = await start()

    const configFile = await resolveConfigFile(undefined, options.config)
    if (configFile) {
      const watcher = chokidar.watch(configFile, {
        ignoreInitial: true,
      })
      watcher.on('change', () => {
        restart('Poveste')
      })
    }
  }
  finally {
    await runPovesteCleanups()
  }
}
