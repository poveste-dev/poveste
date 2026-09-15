/*
 * Asserts that what the Percy plugin posts is the rendered story, not the
 * sandbox shell.
 *
 * This example is a fixture in no e2e job, and the plugin is a silent no-op
 * without an agent — `isPercyEnabled()` is false and `onBuild` returns. So for
 * the life of #352 every snapshot Percy received was an empty page and nothing
 * anywhere said so: uniformly blank snapshots make a stable baseline, and a
 * blank baseline never fails.
 *
 * The agent below answers the three endpoints `@percy/sdk-utils` calls and
 * records what arrives. No Percy account and no token, so this can run
 * anywhere.
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import process from 'node:process'

const PORT = 5338
// Present only once the story has mounted. The shell carries `#app` and the
// hidden mount point, and that is exactly what a `load`-timed snapshot caught.
const RENDERED = 'poveste-generic-render-story'

const posted = []

const agent = createServer((req, res) => {
  if (req.url === '/percy/healthcheck') {
    res.setHeader('x-percy-core-version', '1.30.4')
    res.end(JSON.stringify({ success: true, build: { id: 1 }, type: 'web', widths: [375] }))
    return
  }
  if (req.url === '/percy/dom.js') {
    res.end('window.PercyDOM = { serialize: () => document.documentElement.outerHTML }')
    return
  }
  if (req.url === '/percy/snapshot') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      const payload = JSON.parse(body)
      posted.push({ name: payload.name, html: payload.domSnapshot?.html ?? payload.domSnapshot ?? '' })
      res.end(JSON.stringify({ success: true }))
    })
    return
  }
  res.statusCode = 404
  res.end('{}')
})

function fail(message) {
  console.error(`::error::${message}`)
  agent.close()
  process.exit(1)
}

agent.listen(PORT, () => {
  const build = spawn('npx', ['poveste', 'build'], {
    cwd: import.meta.dirname,
    env: { ...process.env, PERCY_SERVER_ADDRESS: `http://localhost:${PORT}`, PERCY_LOGLEVEL: 'error' },
    stdio: ['ignore', 'ignore', 'inherit'],
  })

  build.on('exit', (code) => {
    if (code !== 0) {
      fail(`the book did not build (exit ${code}), so nothing was snapshotted`)
    }
    // Zero snapshots is the other way this passes while doing nothing: the
    // plugin returns early whenever the agent looks absent.
    if (posted.length === 0) {
      fail('the plugin posted no snapshots at all, so this asserted nothing')
    }

    const blank = posted.filter(snapshot => !snapshot.html.includes(RENDERED))
    if (blank.length > 0) {
      fail(`${blank.length} of ${posted.length} snapshots hold the sandbox shell rather than a rendered story: ${blank.map(s => s.name).join(', ')}`)
    }

    const count = `${posted.length} Percy snapshot${posted.length === 1 ? '' : 's'}`
    console.log(`✅ ${count}, every one holding a rendered story`)
    agent.close()
  })
})
