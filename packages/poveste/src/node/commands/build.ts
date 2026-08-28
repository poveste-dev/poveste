import { build } from '../build.js'
import { runPovesteCleanups } from '../cleanup.js'
import { createContext } from '../context.js'

export interface BuildOptions {
  config?: string
}

export async function buildCommand(options: BuildOptions) {
  // Plugins open things while the config is resolved — before any hook here has
  // run — so the teardown has to span the command, not one phase of it (#434).
  try {
    const ctx = await createContext({
      configFile: options.config,
      mode: 'build',
    })
    await build(ctx)
  }
  finally {
    await runPovesteCleanups()
  }
}
