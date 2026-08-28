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
// So failure is reported here, the exit code set, and the process forced out if
// it does not leave on its own. Closing the collection ports (#426) was not
// enough on its own: a failed build still hangs in the nuxt4 and sveltekit books,
// holding `FSEventWrap` and `FSReqCallback` handles — watchers nothing closes on
// the error path. And `dev` and `preview` hold a listening server by design, so
// for them no amount of leak-fixing would ever let the loop drain.
//
// The timer is unref'd, so it never fires for a process that ends by itself and
// costs nothing when there is nothing to force. It is 500ms rather than
// immediate because exiting on the same tick as `console.error` truncates it:
// writes to a piped stderr are asynchronous, and a framed compiler error is long.
//
// It does mean a leak reads as a clean failure from the outside, so it hides the
// class of bug #426 was. `POVESTE_NO_FORCE_EXIT` below is how that stays visible
// without removing it — CI sets it for one step, where a leak is a hang again.
//
// Asserting on the reported handle list instead was tried and does not work: a
// clean failed build leaves transient ones (`Immediate`, `FSReqCallback`), and the
// allowance needed to go green has to include `FSReqCallback` — most of what the
// sveltekit leak shows as. Whether the loop drains is the question (#433).
/**
 * A build asked to prove it drains: the forced exit below is skipped and what is
 * still holding the loop open is printed.
 *
 * The exit code cannot carry that on its own. Forcing the exit makes a process
 * that leaks look exactly like one that does not, which is what left the CI
 * guard's hang branch unreachable and the #426 class of defect undetectable
 * (#433). Under this flag a leak is a hang again, which is measurable, and the
 * handle list says what to go and close.
 *
 * For CI, not for users — a leak should not be the difference between a build
 * that ends and one that does not.
 */
function proveItDrains(): boolean {
  return !!process.env.POVESTE_NO_FORCE_EXIT
}

function run(command: () => Promise<unknown>): Promise<void> {
  return command().then(() => undefined, (error) => {
    console.error(error)
    process.exitCode = 1

    if (proveItDrains()) {
      setImmediate(() => {
        console.error(`POVESTE_ACTIVE_HANDLES: ${JSON.stringify(process.getActiveResourcesInfo())}`)
      })
      return
    }

    setTimeout(() => process.exit(1), 500).unref()
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
