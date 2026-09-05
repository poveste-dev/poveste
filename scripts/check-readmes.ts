// Asserts that the pages describing this project describe *this* project.
//
// A package's README.md *is* its page on npmjs.com. #184 is what goes wrong
// when nothing checks them: five published packages had no README at all, and
// the one on `poveste` itself told readers to `pnpm add histoire -D`,
// installing the unmaintained project this one forked.
//
// The original three assertions were right for #184 and too narrow for what
// came after: #293 (four badges pointing at workflows deleted a release
// earlier), #294 ("Add the plugin in histoire config" on two npm pages) and
// #296 (a "Poveste Discord" link resolving to histoire's server) all passed
// this check. It read only `packages/*/README.md`, and only inside fences.
//
// Assertions, one per defect actually found:
//   1. every published package has a README, and it says something   (#184)
//   2. no `histoire` in a code fence — readers copy fences           (#184)
//   3. the root README is checked too — the page GitHub shows        (#293)
//   4. every workflow a README links to exists on disk               (#293)
//   5. `histoire` never *instructs*, only recounts                   (#294)
//   6. every external host is one we chose                           (#296)
//
// Two things worth knowing before extending this:
//
// - `github.com/<org>/<repo>/actions/workflows/<missing>.yml` returns HTTP 200
//   for a workflow that does not exist. A link-checker would have gone green on
//   #293. That is why assertion 4 resolves against the filesystem instead.
// - Assertion 6 answers "is this host one we chose" and cannot reason about
//   paths. Three `github.com/histoire-dev/...` links are deliberate attribution
//   and must stay. Nothing here catches an allowlisted host with a wrong path.
//
// No network, by design.

import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES = join(ROOT, 'packages')
const EXAMPLES = join(ROOT, 'examples')
const WORKFLOWS = join(ROOT, '.github', 'workflows')

const MIN_LENGTH = 120

// Hosts this project links to on purpose. An unknown host fails, which is what
// caught #296 — the invite was an opaque `discord.gg` code that never says the
// word "histoire", so no amount of word matching would have found it.
//
// It doubles as a stale-domain check for free: the list encodes where we mean
// to point, so `vitejs.dev`, `v3.nuxtjs.org` and `kit.svelte.dev` fail until
// they are updated to the domains that no longer redirect.
export const ALLOWED_HOSTS = new Set([
  'github.com',
  'poveste.dev',
  // Two channels: `bsky.app` is the project's own handle, verified by the
  // `_atproto` record on poveste.dev; `x.com` is a personal one on purpose,
  // because a maintainer people can follow beats a logo with no followers (#482).
  'bsky.app',
  'x.com',
  // npm strips relative image paths, so the package page needs an absolute one.
  // `raw.githubusercontent.com` on `main` rather than poveste.dev, because the
  // npm README is permanent and the docs site's asset paths are not (#154).
  'raw.githubusercontent.com',
  'www.npmjs.com',
  'npmx.dev',
  'vite.dev',
  'vitest.dev',
  'pnpm.io',
  'git-scm.com',
  'stackoverflow.com',
  'docs.percy.io',
  'www.contributor-covenant.org',
  'nuxt.com',
  'svelte.dev',
  'nodejs.org',
  'unhead.unjs.io',
  'i18n.nuxtjs.org',
])

// A deprecated spelling is allowed to appear — the aliases are still honoured —
// but never as the only one a page teaches, which is how `process.env.HISTOIRE`
// stayed the documented API for two surfaces (#292). Both are set by this repo:
// see `bin.ts` and `preview-settings.ts`.
//
// #203 is building the deprecation inventory; when it lands this table should
// consume it rather than keep a second list that can disagree.
export const DEPRECATED_ALIASES: Array<{ deprecated: string, canonical: string }> = [
  { deprecated: 'process.env.HISTOIRE', canonical: 'process.env.POVESTE' },
  { deprecated: '--histoire-contrast-color', canonical: '--poveste-contrast-color' },
]

export interface AliasTaughtAlone { line: number, deprecated: string, canonical: string }

/**
 * A framework plugin is the first thing a reader installs, so its install line
 * has to name `poveste` too — whether the bare form resolves depends on the
 * reader's `auto-install-peers`, which a README must not lean on (#389).
 *
 * Add-ons like `plugin-percy` are exempt by construction: they declare no
 * framework peer, because they are added to a project that already has one.
 */
const FRAMEWORK_PEERS = new Set(['vue', 'nuxt', 'svelte', 'quasar'])

// Every spelling the READMEs actually use: `pnpm i -D`, `pnpm add -D`, `npm
// install`, `yarn add`, `bun add`.
//
// A source rather than a regex: a shared `/g` regex carries `lastIndex` between
// calls, so each use compiles its own.
const INSTALL_LINE = String.raw`^(?:pnpm|npm|yarn|bun)\s+(?:add|i|install)\b[^\n]*`

function installLines(markdown: string): string[] {
  return markdown.match(new RegExp(INSTALL_LINE, 'gm')) ?? []
}

export function installLineProblems(pkg: string, markdown: string, peers: Record<string, string>): string[] {
  if (!Object.keys(peers).some(name => FRAMEWORK_PEERS.has(name))) {
    return []
  }

  // Every install line, not just the first: a plugin may document more than one
  // (Svelte and SvelteKit differ), and the second is as copyable as the first.
  return installLines(markdown)
    .filter(install => !/(?<![\w/@-])poveste(?![\w-])/.test(install))
    .map(install => `packages/${pkg}/README.md installs a framework plugin without poveste: ${install.trim()}`)
}

/**
 * A README whose only guidance is a config snippet leaves the reader with
 * nothing to run. `plugin-tailwind` and `plugin-quasar` both shipped that way.
 */
export function missingInstallLine(pkg: string, markdown: string): string[] {
  const showsConfig = /```(?:ts|js)\n[\s\S]*?defineConfig\(/.test(markdown)
  const installs = installLines(markdown).length > 0

  return showsConfig && !installs
    ? [`packages/${pkg}/README.md shows a config snippet but never says how to install the package`]
    : []
}

/**
 * The same shape as the "no `histoire` in a code fence" rule, applied to whether
 * the fence actually runs: readers copy fences, and one calling `defineConfig`
 * without importing it throws on the first line they paste.
 */
export function unrunnableFences(where: string, markdown: string): string[] {
  const problems: string[] = []

  for (const [, body] of markdown.matchAll(/```(?:ts|js)\n([\s\S]*?)```/g)) {
    if (/\bdefineConfig\(/.test(body) && !/import\s*\{[^}]*\bdefineConfig\b[^}]*\}\s*from/.test(body)) {
      problems.push(`${where} has a code block calling defineConfig without importing it — readers copy this`)
    }
  }

  return problems
}

/**
 * Which lines belong to a ```diff fence, and where each such fence starts.
 *
 * A removed line names the old spelling *by construction* — that is what a `-`
 * line is — so the unit for a diff block is the block, not the line (#358). Any
 * other fence stays per-line: a `ts` sample built on an alias is exactly the
 * defect this exists for, and #292 is what it cost.
 */
function diffFenceOf(lines: string[]): Array<number | undefined> {
  const owner: Array<number | undefined> = Array.from({ length: lines.length })
  let start: number | undefined
  let inDiff = false

  lines.forEach((line, index) => {
    if (!line.trimStart().startsWith('```')) {
      if (inDiff) {
        owner[index] = start
      }
      return
    }

    if (inDiff) {
      owner[index] = start
      inDiff = false
      start = undefined
      return
    }

    if (/^`{3,}\s*diff\b/.test(line.trim())) {
      inDiff = true
      start = index
      owner[index] = start
    }
  })

  return owner
}

// Per line, not per file. Checking the file as a whole let a page mention the
// canonical name once in prose and still hand the reader a code sample built on
// the alias — which is the sample they copy, and the thing #292 exists about.
//
// The one exception is a ```diff fence, where the unit is the fence. See
// `diffFenceOf` above: this is the third shape of this check, and the reasoning
// for each is worth keeping.
export function aliasesTaughtAlone(content: string): AliasTaughtAlone[] {
  const lines = content.split('\n')
  const owner = diffFenceOf(lines)
  const found: AliasTaughtAlone[] = []

  const fenceText = new Map<number, string>()
  owner.forEach((fence, index) => {
    if (fence !== undefined) {
      fenceText.set(fence, `${fenceText.get(fence) ?? ''}\n${lines[index]}`)
    }
  })

  for (const { deprecated, canonical } of DEPRECATED_ALIASES) {
    const reported = new Set<number>()

    lines.forEach((line, index) => {
      if (!line.includes(deprecated) || line.includes(canonical)) {
        return
      }

      const fence = owner[index]
      if (fence !== undefined) {
        // A diff block that shows the rename names both spellings across its
        // `-` and `+` lines, which is the established style on the migration
        // guide. One that only ever names the alias is still a defect.
        if (fenceText.get(fence)?.includes(canonical) || reported.has(fence)) {
          return
        }
        reported.add(fence)
        found.push({ line: fence + 1, deprecated, canonical })
        return
      }

      found.push({ line: index + 1, deprecated, canonical })
    })
  }

  return found
}

// Only fenced blocks are removed. Inline code is kept on purpose: `histoire`
// in backticks is still the token this is looking for, and stripping it let
// "Add the plugin in `histoire` config" through — the #294 defect one backtick
// from passing.
function withoutFences(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '')
}

// `histoire` naming the past is the whole point of a successor project. What is
// never right is naming it as the thing to act on — "Add the plugin in histoire
// config" was on two npm pages while every fence beneath it said `poveste`.
export function instructsWithHistoire(markdown: string): string[] {
  const INSTRUCTION = /\b(?:add|install|configure|create|register|put|place)\b[^.!?\n]{1,60}\bhistoire\b/i

  // Recounting, migrating or crediting — all legitimate, and all common in the
  // same files. Every exclusion is anchored to `histoire` itself: matching
  // anywhere on the line let any sentence naming a `.config` file, or using the
  // word "coming", switch the whole assertion off.
  const RECOUNTS = [
    // `histoire.config.*` is a supported filename, not an instruction.
    /\bhistoire\.config\b/i,
    /\b(?:from|to|of|than|versus|vs\.?)\s+histoire\b/i,
    /\bhistoire\b[^.!?\n]{1,40}\b(?:keeps? working|still works?|unchanged|no longer|used to|was called)\b/i,
    /\b(?:migrat\w*|successor|formerly|previously|fork\w*|legacy|histoire-era)\b/i,
  ]

  return withoutFences(markdown)
    .split('\n')
    .filter(line => INSTRUCTION.test(line) && !RECOUNTS.some(pattern => pattern.test(line)))
    .map(line => line.trim())
}

export function referencedWorkflows(markdown: string): string[] {
  // Fenced code is skipped: a README showing a consumer how to run Poveste in
  // CI names workflows that live in *their* repo, not this one.
  //
  // A badge names its workflow twice, in the image and in the link it wraps.
  return [...new Set([...withoutFences(markdown).matchAll(/workflows\/([\w.-]+\.ya?ml)/g)].map(match => match[1]))]
}

export function externalHosts(markdown: string): string[] {
  const hosts = new Set<string>()
  for (const match of markdown.matchAll(/https?:\/\/([^/\s)"'>\]]+)/g)) {
    // Markdown ends sentences right after a bare URL, and the punctuation is
    // not part of the host — `vite.dev,` would fail an allowlist that has
    // `vite.dev`.
    const host = match[1].toLowerCase().replace(/[.,;:!?]+$/, '')
    // A loopback example is not a link anyone follows.
    if (/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) {
      continue
    }
    hosts.add(host.replace(/:\d+$/, ''))
  }
  return [...hosts]
}

// Guarded, so importing the helpers above for a test does not run the whole
// check — and cannot reach the `process.exit(1)` below and kill the runner.
async function main(): Promise<void> {
  const problems: string[] = []
  const workflowsOnDisk = new Set(await readdir(WORKFLOWS).catch(() => []))

  // Every page this project owns, not only the npm ones.
  const pages: Array<{ label: string, path: string }> = [
    { label: 'README.md', path: join(ROOT, 'README.md') },
  ]

  let published = 0
  for (const entry of await readdir(PACKAGES)) {
    const dir = join(PACKAGES, entry)
    if (!(await stat(dir)).isDirectory()) {
      continue
    }

    let manifest: any
    try {
      manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
    }
    catch {
      continue
    }
    if (manifest.private) {
      continue
    }

    published++
    const readmePath = join(dir, 'README.md')
    try {
      await stat(readmePath)
    }
    catch {
      problems.push(`${manifest.name} has no README.md — npm renders "This package does not have a README"`)
      continue
    }
    pages.push({ label: manifest.name, path: readmePath })

    const readme = await readFile(readmePath, 'utf8')
    problems.push(...installLineProblems(entry, readme, manifest.peerDependencies ?? {}))
    problems.push(...missingInstallLine(entry, readme))
    problems.push(...unrunnableFences(relative(ROOT, readmePath), readme))
  }

  // Not npm pages, but they are what a contributor opens to find out how to run
  // an example — and they were scaffold output naming create-svelte and linking
  // domains that have since moved (#294).
  for (const entry of await readdir(EXAMPLES).catch(() => [])) {
    const readme = join(EXAMPLES, entry, 'README.md')
    if (await stat(readme).then(() => true).catch(() => false)) {
      pages.push({ label: `examples/${entry}`, path: readme })
    }
  }

  // The issue templates are not READMEs, but they are the pages a first-time
  // visitor is sent to, and #296 lived in one of them.
  const GITHUB_DIR = join(ROOT, '.github')
  for (const entry of await readdir(join(GITHUB_DIR, 'ISSUE_TEMPLATE')).catch(() => [])) {
    if (/\.ya?ml$/.test(entry)) {
      pages.push({ label: `.github/ISSUE_TEMPLATE/${entry}`, path: join(GITHUB_DIR, 'ISSUE_TEMPLATE', entry) })
    }
  }

  for (const page of pages) {
    const content = await readFile(page.path, 'utf8')
    const where = relative(ROOT, page.path)

    if (page.path.endsWith('README.md') && content.trim().length < MIN_LENGTH) {
      problems.push(`${page.label}: ${where} is ${content.trim().length} chars, under the ${MIN_LENGTH} minimum`)
    }

    for (const fence of content.match(/```[\s\S]*?```/g) ?? []) {
      if (/\bhistoire\b/.test(fence)) {
        const line = fence.split('\n').find(l => /\bhistoire\b/.test(l))?.trim()
        problems.push(`${where} has "histoire" in a code block — readers copy this: ${line}`)
        break
      }
    }

    for (const line of instructsWithHistoire(content)) {
      problems.push(`${where} tells the reader to act on histoire, not Poveste: ${line}`)
    }

    for (const workflow of referencedWorkflows(content)) {
      if (!workflowsOnDisk.has(workflow)) {
        problems.push(`${where} links .github/workflows/${workflow}, which does not exist (GitHub serves 200 for it anyway)`)
      }
    }

    for (const host of externalHosts(content)) {
      if (!ALLOWED_HOSTS.has(host)) {
        problems.push(`${where} links ${host}, which is not an allowlisted host — add it to ALLOWED_HOSTS if it is deliberate`)
      }
    }
  }

  // Only this assertion reads `docs/**`: it is where the deprecated spellings
  // live, while the histoire-naming rules above would fight the migration guide.
  const docsDir = join(ROOT, 'docs')
  async function* markdownUnder(dir: string): AsyncGenerator<string> {
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (entry.name === 'node_modules' || entry.name === '.vitepress') {
        continue
      }
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        yield* markdownUnder(path)
      }
      else if (entry.name.endsWith('.md')) {
        yield path
      }
    }
  }

  for (const path of [...pages.map(p => p.path)]) {
    for (const { line, deprecated, canonical } of aliasesTaughtAlone(await readFile(path, 'utf8'))) {
      problems.push(`${relative(ROOT, path)}:${line} names ${deprecated} without ${canonical}`)
    }
  }
  for await (const path of markdownUnder(docsDir)) {
    for (const { line, deprecated, canonical } of aliasesTaughtAlone(await readFile(path, 'utf8'))) {
      problems.push(`${relative(ROOT, path)}:${line} names ${deprecated} without ${canonical}`)
    }
  }

  if (problems.length > 0) {
    console.error('❌ Pages that describe the wrong project, or point nowhere:\n')
    for (const problem of problems) {
      console.error(`  • ${problem}`)
    }
    process.exit(1)
  }

  console.log(`✅ ${pages.length} pages check out, covering all ${published} published packages`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main()
}
