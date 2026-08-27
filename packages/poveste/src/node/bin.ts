import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'pathe'
import sade from 'sade'

const __dirname = dirname(fileURLToPath(import.meta.url))

const { version } = JSON.parse(fs.readFileSync(resolve(__dirname, '../../package.json'), 'utf8'))

process.env.NODE_ENV = process.argv.includes('build') || process.argv.includes('preview') ? 'production' : 'development'
process.env.HISTOIRE = 'true'
process.env.POVESTE = 'true'

// sade does not await an action, so a rejected command was terminated only by
// Node's default handling of the unhandled rejection it became. That is not the
// CLI's to rely on: any dependency can install an `unhandledRejection` listener
// and take it away, which Vike does — and a failed build then ran forever with
// its error already printed (#405).
//
// So failure is reported and exited here, deliberately. `exit` rather than
// `exitCode` because teardown does not get every handle back: after a failed
// build a `Timeout` and three `MessagePort`s are still open, and waiting for an
// empty event loop is what hung in the first place.
function run(command: () => Promise<unknown>): Promise<void> {
  return command().then(() => undefined, (error) => {
    console.error(error)
    process.exitCode = 1
    process.exit(1)
  })
}

const program = sade('poveste')
program.version(version)

program.command('dev')
  .describe('open the stories in your browser for development')
  .option('-p, --port <port>', 'Listening port of the server')
  .option('-c, --config <file>', `[string] use specified config file`)
  .option('--open', 'Open in your default browser')
  .option('--host [host]', '[string] specify hostname (omit value or pass `0.0.0.0` to expose to all network interfaces)')
  .action(async (options) => {
    const { devCommand } = await import('./commands/dev.js')
    return run(() => devCommand(options))
  })

program.command('build')
  .describe('build the poveste final app you can deploy')
  .option('-c, --config <file>', `[string] use specified config file`)
  .action(async (options) => {
    const { buildCommand } = await import('./commands/build.js')
    return run(() => buildCommand(options))
  })

program.command('preview')
  .describe('preview the built directory')
  .option('-p, --port <port>', 'Listening port of the server')
  .option('--open', 'Open in your default browser')
  .option('--host [host]', '[string] specify hostname (omit value or pass `0.0.0.0` to expose to all network interfaces)')
  .action(async (options) => {
    const { previewCommand } = await import('./commands/preview.js')
    return run(() => previewCommand(options))
  })

program.parse(process.argv)
