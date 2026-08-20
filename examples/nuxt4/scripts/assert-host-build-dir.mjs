// Regression guard for #223: `poveste build` must not regenerate the host's
// `.nuxt`. When it did, any later type-aware ESLint or vue-tsc run read
// Poveste's declarations instead of the application's, so the same commit
// passed or failed lint depending on which command ran last.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const hostGenerated = join(root, '.nuxt', 'imports.d.ts')
const auxBuildDir = join(root, '.nuxt', 'poveste')

const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' })
const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex')

function fail(message) {
  console.error(`\n✗ ${message}`)
  process.exit(1)
}

run('pnpm', ['exec', 'nuxt', 'prepare'])
if (!existsSync(hostGenerated)) {
  fail(`${hostGenerated} is missing after \`nuxt prepare\`; the assertion cannot run`)
}

const before = digest(hostGenerated)

run('pnpm', ['run', 'story:build'])

if (!existsSync(hostGenerated)) {
  fail('`poveste build` deleted the host\'s .nuxt/imports.d.ts')
}

if (digest(hostGenerated) !== before) {
  fail('.nuxt/imports.d.ts changed during `poveste build` — the auxiliary Nuxt instance wrote into the host build dir (#223)')
}

if (!existsSync(auxBuildDir)) {
  fail('expected the auxiliary Nuxt instance to build into .nuxt/poveste')
}

console.log('\n✓ host .nuxt untouched; auxiliary instance built into .nuxt/poveste')
