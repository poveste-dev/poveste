import type { Plugin } from 'vite'

/**
 * Keeps SvelteKit 3's dev server out of the book. Kit 3 moved its middleware and
 * preview server from `vite-plugin-sveltekit-compile`, which poveste ignores, into
 * `vite-plugin-sveltekit-setup`, whose config the book still needs: aliases,
 * `server.fs`, `define`. So that plugin stays, and only its server hooks go (#1200).
 *
 * At `configResolved`, which runs before Vite collects the server hooks. Kit 2's
 * `setup` has neither hook, so this changes nothing there.
 */
export function withoutSvelteKitServer(): Plugin {
  return {
    name: 'poveste:sveltekit-server',
    enforce: 'pre',
    configResolved(config) {
      for (const plugin of config.plugins) {
        if (plugin.name === 'vite-plugin-sveltekit-setup') {
          delete (plugin as Partial<Plugin>).configureServer
          delete (plugin as Partial<Plugin>).configurePreviewServer
        }
      }
    },
  }
}
