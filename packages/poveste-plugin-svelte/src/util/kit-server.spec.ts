import type { Plugin, ResolvedConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import { withoutSvelteKitServer } from './kit-server.js'

function resolve(plugins: Plugin[]) {
  const hook = withoutSvelteKitServer().configResolved as (config: ResolvedConfig) => void
  hook({ plugins } as unknown as ResolvedConfig)
  return plugins
}

describe('withoutSvelteKitServer', () => {
  it('takes the server hooks off SvelteKit 3\'s setup plugin and leaves its config', () => {
    const config = () => ({})
    const [setup] = resolve([{ name: 'vite-plugin-sveltekit-setup', config, configureServer: () => {}, configurePreviewServer: () => {} }])

    expect(setup).toEqual({ name: 'vite-plugin-sveltekit-setup', config })
  })

  it('leaves every other plugin\'s server alone', () => {
    const configureServer = () => {}

    const [other] = resolve([{ name: 'vite-plugin-other', configureServer }])

    expect(other!.configureServer).toBe(configureServer)
  })
})
