import type { FSWatcher } from 'chokidar'
import { constants } from 'node:os'
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

/**
 * Starts `poveste dev` and resolves once the server is listening, with the function
 * that stops it.
 *
 * Plugins register process cleanups while the config resolves, and what they open
 * serves the whole session, so those cleanups run when the server stops: on
 * `stop`, before a restart starts again, on SIGINT or SIGTERM, and when the start
 * fails. They ran in a `finally` once this function returned, which is while the
 * server was still serving (#866).
 */
export async function devCommand(options: DevOptions): Promise<{ stop: () => Promise<void> }> {
  const port = resolvePort(options.port, 'dev')

  let stopServer: (() => Promise<void>) | null = null
  let restarting: Promise<void> | undefined
  let stopped = false

  // Held across restarts rather than by each server: a restart that fails on the
  // Vite config has no server to hand one back, and the save that fixes it has to
  // be seen.
  let viteConfigWatcher: FSWatcher | undefined
  let watchedViteConfigFile: string | null = null

  async function watchViteConfig(file: string | null) {
    if (file === watchedViteConfigFile) {
      return
    }
    await viteConfigWatcher?.close()
    viteConfigWatcher = undefined
    watchedViteConfigFile = file
    if (file) {
      viteConfigWatcher = chokidar.watch(file, {
        ignoreInitial: true,
      })
      viteConfigWatcher.on('change', () => {
        restart('Vite')
      })
    }
  }

  async function stopSession() {
    const stopping = stopServer
    stopServer = null
    await stopping?.()
    await runPovesteCleanups()
  }

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
    await watchViteConfig(viteConfigFile)
    return close
  }

  function restart(source: string) {
    if (restarting || stopped) {
      return
    }
    console.log(pc.blue(`${source} config changed, restarting...`))
    restarting = (async () => {
      try {
        await stopSession()
        stopServer = await start()
      }
      catch (error) {
        // A config saved half-written fails to load. What that start registered is
        // released, and the watchers stay, so the save that fixes it restarts again.
        await runPovesteCleanups()
        console.error(pc.red('Restart failed; save the config again once it is fixed.'), error)
      }
      finally {
        restarting = undefined
      }
    })()
  }

  try {
    stopServer = await start()
  }
  catch (error) {
    await watchViteConfig(null)
    await runPovesteCleanups()
    throw error
  }

  let configWatcher: FSWatcher | undefined
  const configFile = await resolveConfigFile(undefined, options.config)
  if (configFile) {
    configWatcher = chokidar.watch(configFile, {
      ignoreInitial: true,
    })
    configWatcher.on('change', () => {
      restart('Poveste')
    })
  }

  async function stop() {
    stopped = true
    process.off('SIGINT', onSignal)
    process.off('SIGTERM', onSignal)
    await configWatcher?.close()
    // A restart in flight would otherwise start a server after this one returned.
    await restarting
    await watchViteConfig(null)
    await stopSession()
  }

  // Handling a signal replaces Node's default exit, so the exit is ours to make.
  // Vite also listens for SIGTERM and exits once its own server has closed, so
  // there the cleanups race it; SIGINT is poveste's alone.
  function onSignal(signal: NodeJS.Signals) {
    stop().finally(() => process.exit(128 + constants.signals[signal]))
  }
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)

  return { stop }
}
