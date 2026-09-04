// Asserts that poveste.dev tells a crawler the truth.
//
// Both defects this covers hid behind an HTTP 200. `/robots.txt` answered 200
// with an HTML page because the file did not exist (#288); every missing path
// answered 200 with the home page because the catch-all was an SPA rewrite
// (#343). A status-code check called the site healthy in both cases. So this
// reads bodies, never statuses alone.
//
// Six assertions, one per defect found or hazard the config leaves open:
//   1. no catch-all that answers a miss with success — #343
//   2. nothing sits below a catch-all                — Netlify takes the first match
//   3. every redirect target was built               — a rename turns old links into 404s
//   4. no redirect target keeps the retired .html shape — #575
//   5. robots.txt is a real robots.txt               — #288
//   6. the sitemap lists the built pages, and only those
//   7. the hostname is declared everywhere it should be, and agrees
//   8. one <title> per page, and none inside an <svg> — #571
//
// Netlify reads redirects from two places, so this does too: a `_redirects`
// file under `docs/public/` ships into the build and would reintroduce #343
// with netlify.toml untouched.
//
// `--live [url]` runs the same contract against a deployed site instead of the
// build, defaulting to production. It is not wired into CI: poveste.dev deploys
// from `main` (#321), so a PR cannot prove production. Run it against a deploy
// preview before a redirect change lands, and against production after.

import { existsSync, readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'docs', '.vitepress', 'dist')

export interface Redirect { from: string, to: string, status: number }

interface Built { pages: string[], paths: Set<string> }

// No TOML parser in the tree, and one table type is all this needs.
export function parseRedirects(toml: string): Redirect[] {
  const source = toml.replace(/^\s*#.*$/gm, '')
  const redirects: Redirect[] = []

  for (const chunk of source.split(/^\[\[redirects\]\]\s*$/m).slice(1)) {
    const body = chunk.split(/^\[/m)[0]
    const read = (key: string) => body.match(new RegExp(`^\\s*${key}\\s*=\\s*"?([^"\\n]+?)"?\\s*$`, 'm'))?.[1]
    const from = read('from')
    const to = read('to')
    if (from && to) {
      redirects.push({ from, to, status: Number(read('status') ?? 301) })
    }
  }

  return redirects
}

// The `_redirects` line format: `from to [status[!]] [conditions]`.
export function parseRedirectsFile(text: string): Redirect[] {
  const redirects: Redirect[] = []

  for (const line of text.split('\n')) {
    const [from, to, status] = line.replace(/#.*$/, '').trim().split(/\s+/)
    if (from && to) {
      redirects.push({ from, to, status: status === undefined ? 301 : Number(status.replace(/!$/, '')) })
    }
  }

  return redirects
}

export function isCatchAll(redirect: Redirect): boolean {
  return redirect.from === '/*'
}

// A catch-all is only safe if it hands the client a redirect or an error. Anything
// else — a 200 rewrite, or a status too malformed to read — answers a miss with
// success, which is the soft 404. NaN fails this test rather than slipping past a
// `>= 200 && < 300` range check.
export function unsafeCatchAlls(redirects: Redirect[]): Redirect[] {
  return redirects.filter(r => isCatchAll(r) && !(r.status >= 300 && r.status < 600))
}

export function rulesBelowCatchAll(redirects: Redirect[]): Redirect[] {
  const first = redirects.findIndex(isCatchAll)
  return first === -1 ? [] : redirects.slice(first + 1)
}

/**
 * How Netlify resolves a path against the publish directory.
 *
 * A url is not a file path, and `cleanUrls` is the whole reason: VitePress still
 * writes `guide/getting-started.html`, and the address it tells the world is
 * `/guide/getting-started`. Netlify tries the literal file, then `.html`, then a
 * directory index. Resolving only the literal path made a correct redirect look
 * broken (#575) — the check disagreed with the server it is describing.
 */
export function resolvesInBuild(target: string, built: Set<string>): boolean {
  const path = target.replace(/\/$/, '') || '/'
  return built.has(path) || built.has(`${path}.html`) || built.has(`${path === '/' ? '' : path}/index.html`)
}

// `:splat` targets name a directory; everything else names a file. Targets that
// leave the site — an absolute url — are nothing this can resolve.
export function missingRedirectTargets(redirects: Redirect[], built: Set<string>): Redirect[] {
  return redirects.filter((redirect) => {
    if (isCatchAll(redirect)) {
      return false
    }
    const target = redirect.to.replace(/[#?].*$/, '')
    if (/^[a-z][\w+.-]*:\/\//i.test(target) || target.startsWith('//')) {
      return false
    }
    if (target.endsWith(':splat')) {
      return !built.has(target.replace(/:splat$/, '').replace(/\/$/, '') || '/')
    }
    return !resolvesInBuild(target, built)
  })
}

/**
 * Redirect targets still naming the `.html` shape `cleanUrls` retired.
 *
 * These resolve, which is why they survived the assertion above: `/new` served a
 * 301 to `/guide/getting-started.html`, which answered 200 and then declared a
 * canonical pointing somewhere else (#575). An inbound link paid for a hop to
 * reach a page disclaiming its own address.
 *
 * Only the site's own paths — an off-site target's shape is its owner's business.
 */
export function staleHtmlTargets(redirects: Redirect[]): Redirect[] {
  return redirects.filter((redirect) => {
    const target = redirect.to.replace(/[#?].*$/, '')
    if (/^[a-z][\w+.-]*:\/\//i.test(target) || target.startsWith('//')) {
      return false
    }
    return target.endsWith('.html')
  })
}

export function robotsProblems(body: string): string[] {
  const problems: string[] = []
  if (body.trimStart().startsWith('<')) {
    problems.push('robots.txt is markup — a crawler gets a parse error where the crawl rules should be')
  }
  if (!/^\s*User-agent:/im.test(body)) {
    problems.push('robots.txt declares no User-agent')
  }
  if (!/^\s*Sitemap:\s*\S+/im.test(body)) {
    problems.push('robots.txt names no sitemap')
  }
  return problems
}

// The build stamps Netlify's BRANCH/COMMIT_REF/CONTEXT into the page, so a live run
// can say which deploy it reached instead of leaving that to be inferred (#321).
// Attribute order and quoting are the renderer's business, not a contract, so this
// finds the tag first and reads `content` out of it either way.
export function deployMarker(html: string): string | undefined {
  const tag = html.match(/<meta[^>]*poveste:deploy[^>]*>/i)?.[0]
  const content = tag?.match(/content=(?:"([^"]*)"|'([^']*)')/i)
  const raw = content?.[1] ?? content?.[2]
  return raw ? decodeEntities(raw) : undefined
}

// The renderer escapes the value, and git permits `&` and `"` in a branch name, so
// an undecoded marker would name something you cannot paste back into git.
// `&amp;` last, or `&amp;quot;` would decode twice.
function decodeEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, '\'')
    .replace(/&apos;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

export function sitemapLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])
}

/**
 * The address a built page is served and indexed at.
 *
 * Netlify answers both `/foo` and `/foo.html`, and `cleanUrls` picks the first —
 * so that is what the sitemap lists and what the canonical claims (#502). Only a
 * whole `index.html` segment is an index; `myindex.html` is a page in its own
 * right.
 */
export function pageUrlPath(page: string): string {
  return page.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')
}

// VitePress renders one file per page and generates the sitemap from the same
// build, so these agree exactly or something silently stopped.
export function sitemapGaps(builtPages: string[], listed: string[]): { missing: string[], extra: string[] } {
  const expected = new Set(
    builtPages
      .filter(page => page !== '/404.html')
      .map(pageUrlPath),
  )
  const present = new Set(listed)

  return {
    missing: [...expected].filter(page => !present.has(page)).sort(),
    extra: [...present].filter(page => !expected.has(page)).sort(),
  }
}

// Every place the site states its own hostname. A declaration that goes missing
// is reported, not skipped: a reformat must not quietly retire an assertion.
export const HOSTNAME_DECLARATIONS = [
  'robots.txt Sitemap:',
  'config sitemap.hostname',
  'config SITE',
  'config og:image',
] as const

export interface Declaration { where: string, url: string, origin?: string }

export function declaredOrigins(robots: string, config: string): Declaration[] {
  const found: Declaration[] = []
  const push = (where: string, url: string | undefined) => {
    if (url) {
      found.push({ where, url, origin: absoluteOrigin(url) })
    }
  }

  push('robots.txt Sitemap:', robots.match(/^\s*Sitemap:\s*(\S+)/im)?.[1])
  push('config sitemap.hostname', config.match(/hostname:\s*['"]([^'"]+)['"]/)?.[1])
  // `og:url` is per page now, built from this constant rather than declared once.
  push('config SITE', config.match(/const SITE\s*=\s*['"]([^'"]+)['"]/)?.[1])
  for (const property of ['og:image']) {
    push(`config ${property}`, config.match(new RegExp(`property:\\s*['"]${property}['"],\\s*content:\\s*['"]([^'"]+)['"]`))?.[1])
  }

  return found
}

function absoluteOrigin(url: string): string | undefined {
  try {
    return new URL(url).origin
  }
  catch {
    return undefined
  }
}

export interface BuiltPage { path: string, html: string }

/**
 * The document's own title, with any inside an `<svg>` removed first.
 *
 * `<title>` is valid inside an `<svg>`, where it is the element's accessible
 * name and not the document's — a conforming parser scopes it to the SVG
 * namespace. Not every consumer does: three inline social icons put three
 * `<title>Bluesky</title>` on every page, and Bing reported the 7-character one
 * as the page title (#571).
 */
export function documentTitles(html: string): string[] {
  const outside = html.replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
  return [...outside.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map(match => match[1].trim())
}

export function svgTitles(html: string): string[] {
  return [...html.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)]
    .flatMap(svg => [...svg[0].matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map(match => match[1].trim()))
}

/**
 * One title per page, and nothing competing with it.
 *
 * An icon inside a labelled link needs no name of its own — the anchor's
 * `aria-label` is what assistive technology reads, and VitePress's own social
 * icons carry none for that reason. So a `<title>` in an `<svg>` here is a
 * second name for one control at best, and a second document title at worst.
 */
export function titleProblems(pages: BuiltPage[]): string[] {
  const problems: string[] = []

  for (const { path, html } of pages) {
    const titles = documentTitles(html)
    if (titles.length === 0) {
      problems.push(`${path} has no <title>`)
    }
    else if (titles.length > 1) {
      problems.push(`${path} has ${titles.length} document titles: ${titles.map(title => `"${title}"`).join(', ')}`)
    }

    const inSvg = svgTitles(html)
    if (inSvg.length > 0) {
      const named = [...new Set(inSvg)].map(title => `"${title}"`).join(', ')
      problems.push(`${path} has ${inSvg.length} <title> inside an <svg> (${named}) — an icon in a labelled link is decorative, so mark it aria-hidden instead`)
    }
  }

  return problems.sort()
}

/**
 * Every page states its own address, and no two state the same one.
 *
 * The origin check above reads `og:url` from the config and asserts its
 * hostname. That was true and blind: one declaration, emitted verbatim on all 37
 * pages, so every page named the home page as its address and Google indexed one
 * of them (#502). Only the built output shows that, which is why this reads it.
 */
export function selfDeclarationProblems(pages: BuiltPage[]): string[] {
  const problems: string[] = []
  const claimants = new Map<string, string[]>()

  for (const { path, html } of pages) {
    const expected = pageUrlPath(path)
    const canonical = html.match(/<link[^>]+rel="canonical"[^>]*href="([^"]*)"/)?.[1]
    const ogUrl = html.match(/<meta[^>]+property="og:url"[^>]*content="([^"]*)"/)?.[1]

    if (canonical === undefined) {
      problems.push(`${path} has no <link rel="canonical">, so nothing says which of its two urls counts`)
    }
    else if (absoluteOrigin(canonical) === undefined) {
      problems.push(`${path} declares a canonical that is not an absolute url: ${canonical}`)
    }
    else if (new URL(canonical).pathname !== expected) {
      problems.push(`${path} declares ${new URL(canonical).pathname} as its canonical, not ${expected}`)
    }

    if (ogUrl === undefined) {
      problems.push(`${path} has no og:url`)
    }
    else {
      if (canonical !== undefined && ogUrl !== canonical) {
        problems.push(`${path} declares og:url ${ogUrl} and canonical ${canonical}`)
      }
      claimants.set(ogUrl, [...(claimants.get(ogUrl) ?? []), path])
    }
  }

  for (const [url, pages] of claimants) {
    if (pages.length > 1) {
      problems.push(`${pages.length} pages declare og:url ${url}: ${pages.sort().slice(0, 3).join(', ')}${pages.length > 3 ? ', …' : ''}`)
    }
  }

  return problems.sort()
}

async function builtEntries(dist: string): Promise<Built> {
  const entries = await readdir(dist, { recursive: true, withFileTypes: true })
  const pages: string[] = []
  const paths = new Set<string>(['/'])

  for (const entry of entries) {
    // readdir joins with the platform separator; site paths are always posix.
    const path = `/${relative(dist, join(entry.parentPath, entry.name)).split(sep).join('/')}`
    paths.add(path)
    if (entry.isFile() && path.endsWith('.html')) {
      pages.push(path)
    }
  }

  return { pages, paths }
}

// Reads a file the check cannot do without, reporting its absence rather than
// dying on it — deleting one is a defect this should name, not crash on.
function readRequired(path: string, problems: string[]): string | undefined {
  try {
    return readFileSync(join(ROOT, path), 'utf8')
  }
  catch {
    problems.push(`${path} is missing, and the site is built from it`)
    return undefined
  }
}

function checkBuild(problems: string[], built: Built | undefined): void {
  if (!built) {
    problems.push(`no build at ${DIST} — run \`pnpm run docs:build\` first`)
    return
  }

  if (!built.paths.has('/404.html')) {
    problems.push('404.html is not in the build — with no catch-all, misses fall back to the host default page')
  }

  if (!built.paths.has('/robots.txt')) {
    problems.push('robots.txt is not in the build — the host will answer /robots.txt with the 404 page')
  }
  else {
    problems.push(...robotsProblems(readFileSync(join(DIST, 'robots.txt'), 'utf8')))
  }

  if (!built.paths.has('/sitemap.xml')) {
    problems.push('sitemap.xml is not in the build — `sitemap.hostname` is unset in the VitePress config')
    return
  }

  const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf8')
  if (!xml.trimStart().startsWith('<?xml')) {
    problems.push('sitemap.xml is not XML')
  }

  const listed: string[] = []
  for (const url of sitemapLocations(xml)) {
    const path = absoluteOrigin(url) ? new URL(url).pathname : undefined
    if (path === undefined) {
      problems.push(`the sitemap lists \`${url}\`, which is not an absolute url`)
    }
    else {
      listed.push(path)
    }
  }

  const pages = built.pages.map(page => ({ path: page, html: readFileSync(join(DIST, page.slice(1)), 'utf8') }))

  // 404.html has no canonical to check — it is not a page anyone should reach by
  // name — but it renders the same nav and footer, so it carries the same titles.
  problems.push(...selfDeclarationProblems(pages.filter(page => page.path !== '/404.html')))
  problems.push(...titleProblems(pages))

  const { missing, extra } = sitemapGaps(built.pages, listed)
  for (const page of missing) {
    problems.push(`${page} was built and is not in the sitemap`)
  }
  for (const page of extra) {
    problems.push(`the sitemap lists ${page}, which the build does not contain`)
  }
}

// Netlify honours netlify.toml first and `_redirects` second, so both are read.
function redirectSources(problems: string[]): { file: string, redirects: Redirect[] }[] {
  const sources: { file: string, redirects: Redirect[] }[] = []

  const toml = readRequired('netlify.toml', problems)
  if (toml !== undefined) {
    sources.push({ file: 'netlify.toml', redirects: parseRedirects(toml) })
  }

  // The build copy is usually the source copy; report it once, unless they differ.
  const seen = new Set<string>()
  for (const file of ['docs/public/_redirects', 'docs/.vitepress/dist/_redirects']) {
    if (!existsSync(join(ROOT, file))) {
      continue
    }
    const text = readFileSync(join(ROOT, file), 'utf8')
    if (!seen.has(text)) {
      seen.add(text)
      sources.push({ file, redirects: parseRedirectsFile(text) })
    }
  }

  return sources
}

function checkConfig(problems: string[], built: Built | undefined): void {
  for (const { file, redirects } of redirectSources(problems)) {
    for (const redirect of unsafeCatchAlls(redirects)) {
      const status = Number.isNaN(redirect.status) ? 'an unreadable status' : `status ${redirect.status}`
      problems.push(`${file}: \`${redirect.from}\` answers every missing path with \`${redirect.to}\` and ${status} — that is a soft 404`)
    }
    for (const redirect of rulesBelowCatchAll(redirects)) {
      problems.push(`${file}: \`${redirect.from}\` sits below a \`/*\` rule and can never match`)
    }
    if (built) {
      for (const redirect of missingRedirectTargets(redirects, built.paths)) {
        problems.push(`${file}: \`${redirect.from}\` redirects to \`${redirect.to}\`, which the build does not contain`)
      }
    }
    for (const redirect of staleHtmlTargets(redirects)) {
      problems.push(`${file}: \`${redirect.from}\` redirects to \`${redirect.to}\`, which canonicalises to \`${redirect.to.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')}\` — send the link there directly`)
    }
  }

  const robots = readRequired('docs/public/robots.txt', problems)
  const config = readRequired('docs/.vitepress/config.js', problems)
  if (robots === undefined || config === undefined) {
    return
  }

  const declared = declaredOrigins(robots, config)
  for (const where of HOSTNAME_DECLARATIONS) {
    if (!declared.some(declaration => declaration.where === where)) {
      problems.push(`${where} declares no hostname — nothing checks that one any more`)
    }
  }

  for (const { where, url, origin } of declared) {
    if (!origin) {
      problems.push(`${where} declares \`${url}\`, which is not an absolute url`)
    }
  }

  const absolute = declared.filter(declaration => declaration.origin)
  const canonical = absolute[0]
  for (const { where, origin } of absolute) {
    if (origin !== canonical.origin) {
      problems.push(`${where} declares ${origin}, but ${canonical.where} declares ${canonical.origin}`)
    }
  }
}

const SITE = 'https://poveste.dev'

// `--live` alone means production; `--live <url>` means a deploy preview.
export function liveTarget(argv: string[]): string {
  const flag = argv.indexOf('--live')
  if (flag === -1) {
    return SITE
  }
  const candidate = argv[flag + 1]
  return candidate && !candidate.startsWith('-') ? candidate.replace(/\/$/, '') : SITE
}

async function checkLive(problems: string[], site: string): Promise<string | undefined> {
  const get = async (path: string) => {
    const response = await fetch(`${site}${path}`, { redirect: 'manual' })
    return {
      status: response.status,
      type: response.headers.get('content-type') ?? '',
      location: response.headers.get('location') ?? '',
      body: await response.text(),
    }
  }

  const robots = await get('/robots.txt')
  problems.push(...robotsProblems(robots.body).map(problem => `live: ${problem}`))

  const sitemap = await get('/sitemap.xml')
  if (!sitemap.body.trimStart().startsWith('<?xml')) {
    problems.push(`live: /sitemap.xml answered ${sitemap.status} ${sitemap.type} and is not XML`)
  }

  const missing = await get('/this-path-does-not-exist-poveste-guard')
  if (missing.status !== 404) {
    problems.push(`live: a missing path answered ${missing.status}, not 404 — search engines index it as a duplicate of whatever it served`)
  }

  const page = await get('/guide/getting-started.html')
  if (page.status !== 200) {
    problems.push(`live: /guide/getting-started.html answered ${page.status}, not 200`)
  }

  // A 301 to the wrong place is invisible from the repo, so follow it.
  const legacy = await get('/guide/vue3/stories.html')
  const expected = '/guide/vue/stories.html'
  if (legacy.status !== 301) {
    problems.push(`live: a histoire-era path answered ${legacy.status}, not 301 — years of inbound links land on it`)
  }
  else if (new URL(legacy.location, site).pathname !== expected) {
    problems.push(`live: /guide/vue3/stories.html redirects to ${legacy.location}, not ${expected}`)
  }
  else {
    const target = await get(expected)
    if (target.status !== 200) {
      problems.push(`live: /guide/vue3/stories.html redirects to ${expected}, which answers ${target.status}`)
    }
  }

  // Informational only, and it runs after every assertion — so a blip here must not
  // cost the report that is already in hand.
  try {
    return deployMarker((await get('/')).body)
  }
  catch {
    return undefined
  }
}

async function main(): Promise<void> {
  const live = process.argv.includes('--live')
  const site = liveTarget(process.argv)
  const problems: string[] = []

  let deployed: string | undefined
  if (live) {
    deployed = await checkLive(problems, site)
  }
  else {
    const built = existsSync(DIST) ? await builtEntries(DIST) : undefined
    checkConfig(problems, built)
    checkBuild(problems, built)
  }

  // Which deploy was reached matters as much as the verdict: a green run against a
  // stale deploy proves nothing about the commit in hand.
  const reached = live ? `${site} (${deployed ?? 'deploy unidentified'})` : 'The docs site'

  if (problems.length) {
    console.error(`${reached} does not hold up:\n`)
    for (const problem of problems) {
      console.error(`  ✗ ${problem}`)
    }
    process.exit(1)
  }

  console.log(live ? `${reached} answers correctly.` : 'The docs site config and build hold up.')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main()
}
