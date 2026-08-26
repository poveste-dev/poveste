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
import { fileURLToPath } from 'node:url'

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

export function aliasesTaughtAlone(content: string): string[] {
  return DEPRECATED_ALIASES
    .filter(({ deprecated, canonical }) => content.includes(deprecated) && !content.includes(canonical))
    .map(({ deprecated, canonical }) => `${deprecated} (canonical: ${canonical})`)
}

function withoutFences(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
}

// `histoire` naming the past is the whole point of a successor project. What is
// never right is naming it as the thing to act on — "Add the plugin in histoire
// config" was on two npm pages while every fence beneath it said `poveste`.
export function instructsWithHistoire(markdown: string): string[] {
  const INSTRUCTION = /\b(?:add|install|configure|create|register|put|place)\b[^.!?\n]{1,60}\bhistoire\b/i
  // Recounting, migrating or crediting — all legitimate, and all common in the
  // same files. `histoire.config.*` is a supported filename, not an instruction.
  const RECOUNTS = /\b(?:coming from|migrat|used to|keeps? working|unchanged|successor|formerly|previously|coming|was called|forked|instead of|no longer|legacy|histoire-era|\.config)\b/i

  return withoutFences(markdown)
    .split('\n')
    .filter(line => INSTRUCTION.test(line) && !RECOUNTS.test(line))
    .map(line => line.trim())
}

export function referencedWorkflows(markdown: string): string[] {
  // A badge names its workflow twice, in the image and in the link it wraps.
  return [...new Set([...markdown.matchAll(/workflows\/([\w.-]+\.ya?ml)/g)].map(match => match[1]))]
}

export function externalHosts(markdown: string): string[] {
  const hosts = new Set<string>()
  for (const match of markdown.matchAll(/https?:\/\/([^/\s)"'>\]]+)/g)) {
    const host = match[1].toLowerCase()
    // A loopback example is not a link anyone follows.
    if (/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) {
      continue
    }
    hosts.add(host.replace(/:\d+$/, ''))
  }
  return [...hosts]
}

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
  for (const alias of aliasesTaughtAlone(await readFile(path, 'utf8'))) {
    problems.push(`${relative(ROOT, path)} teaches only the deprecated ${alias}`)
  }
}
for await (const path of markdownUnder(docsDir)) {
  for (const alias of aliasesTaughtAlone(await readFile(path, 'utf8'))) {
    problems.push(`${relative(ROOT, path)} teaches only the deprecated ${alias}`)
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
