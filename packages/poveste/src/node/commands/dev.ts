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
  let restarting = false

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
    if (restarting) {
      return
    }
    restarting = true
    console.log(pc.blue(`${source} config changed, restarting...`))
    try {
      await stopSession()
      stopServer = await start()
    }
    catch (error) {
      // A config saved half-written fails to load. What that start registered is
      // released, and the watcher stays, so the save that fixes it restarts again.
      await runPovesteCleanups()
      console.error(pc.red('Restart failed; save the config again once it is fixed.'), error)
    }
    finally {
      restarting = false
    }
  }

  try {
    stopServer = await start()
  }
  catch (error) {
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
    process.off('SIGINT', onSignal)
    process.off('SIGTERM', onSignal)
    await configWatcher?.close()
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
