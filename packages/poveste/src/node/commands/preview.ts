import { createContext } from '../context.js'
import { startPreview } from '../preview.js'
import { resolvePort } from './port.js'

export interface PreviewOptions {
  port?: number | string
  host?: string | boolean
  open?: boolean
}

export async function previewCommand(options: PreviewOptions) {
  const port = resolvePort(options.port, 'preview')

  const ctx = await createContext({
    mode: 'build',
  })

  for (const plugin of ctx.config.plugins) {
    if (plugin.onPreview) {
      await plugin.onPreview()
    }
  }

  const { printUrls } = await startPreview({
    port,
    host: options.host,
    open: options.open,
  }, ctx)
  printUrls()
}
