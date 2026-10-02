// Builds `/llms.txt`, the plain-text map of the docs that an agent reads instead of
// crawling, and `/llms-full.txt`, the same pages' text in one file (#1127). Everything in it comes from somewhere the site already keeps
// current: the pages from the nav and sidebar, each line from the page's own
// `description`, the plugins from the workspace manifests. A hand-written list is
// what drifts, and `pnpm run test:docs-site` holds the result to the build.

const { readdirSync, readFileSync } = require('node:fs')
const { join, posix } = require('node:path')

// Named only while no plugin exists for it: a framework that gains a nav entry
// drops out of this sentence on its own.
const UNSUPPORTED = ['React', 'Angular', 'Preact', 'Lit', 'Qwik']

// A framework whose plugin does less than the others says so wherever it is
// listed beside them. Solid renders stories but has no controls until #1114 and
// #1110; its entry goes when they land.
const QUALIFIED = { Solid: 'renderer only' }

// The plugins a reader can install. Every public package publishes in lockstep and
// the site serves `main`, which only moves at a release, so a plugin listed here is
// on npm by the time poveste.dev serves this file.
function publishedPlugins(packagesDir) {
  return readdirSync(packagesDir)
    .map(dir => JSON.parse(readFileSync(join(packagesDir, dir, 'package.json'), 'utf8')))
    .filter(manifest => !manifest.private && (manifest.name === 'poveste' || manifest.name.startsWith('@poveste/plugin-')))
    .sort((a, b) => (a.name === 'poveste' ? -1 : b.name === 'poveste' ? 1 : a.name.localeCompare(b.name)))
}

// The general guide first, then each framework's, then the rest in config order.
function sidebarGroups(sidebar) {
  const rank = key => (key === '/guide/' ? 0 : key.startsWith('/guide/') ? 1 : 2)
  return Object.keys(sidebar)
    .map((key, index) => ({ key, index }))
    .sort((a, b) => rank(a.key) - rank(b.key) || a.index - b.index)
    .flatMap(({ key }) => sidebar[key])
}

function navGroup(nav, text) {
  const group = nav.flatMap(item => item.items ?? []).find(item => item.text === text)
  if (!group) {
    throw new Error(`llms.txt: the nav has no "${text}" group to list the frameworks from`)
  }
  return group
}

function list(names) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

/**
 * The pages in the order both files list them: the nav's frameworks, then the
 * sidebar, then top-level nav links, each page once, under its first section.
 *
 * @param {any[]} nav `themeConfig.nav`
 * @param {Record<string, any[]>} sidebar `themeConfig.sidebar`
 */
function llmsSections(nav, sidebar) {
  const frameworks = navGroup(nav, 'Frameworks')
  // A top-level nav link is a page too, and the only route to `/examples/`.
  const navPages = nav.filter(item => item.link).map(item => ({ text: item.text, items: [item] }))

  const seen = new Set()
  const sections = []
  for (const group of [frameworks, ...sidebarGroups(sidebar), ...navPages]) {
    const links = (group.items ?? []).filter(item => item.link?.startsWith('/') && !seen.has(item.link))
    for (const item of links) {
      seen.add(item.link)
    }
    if (links.length > 0) {
      sections.push({ title: group.text, links })
    }
  }
  return sections
}

function preamble(nav, version) {
  const supported = navGroup(nav, 'Frameworks').items.map(item => item.text)
  const unsupported = UNSUPPORTED.filter(name => !supported.includes(name))
  const named = supported.map(name => (QUALIFIED[name] ? `${name} (${QUALIFIED[name]})` : name))
  return [
    '# Poveste',
    '',
    '> Interactive component playgrounds, built with Vite from story files: a maintained, drop-in fork of histoire.',
    '',
    `Supported frameworks: ${list(named)}.${unsupported.length ? ` ${list(unsupported)} have no plugin, so their components cannot be written as stories.` : ''}`,
    '',
    `Current version: ${version}. Install \`poveste\` and the plugin for your framework at the same version.`,
    '',
  ]
}

/**
 * @param {object} options
 * @param {string} options.site the origin pages are linked under
 * @param {any[]} options.nav `themeConfig.nav`
 * @param {Record<string, any[]>} options.sidebar `themeConfig.sidebar`
 * @param {Map<string, string>} options.descriptions page path, as linked, to its `description`
 * @param {{ name: string, description?: string }[]} options.plugins
 * @param {string} options.version
 */
function llmsTxt({ site, nav, sidebar, descriptions, plugins, version }) {
  const line = (text, url, description) => `- [${text}](${url})${description ? `: ${description}` : ''}`

  return [
    ...preamble(nav, version),
    ...llmsSections(nav, sidebar).flatMap(({ title, links }) => [
      `## ${title}`,
      '',
      ...links.map(item => line(item.text, `${site}${item.link}`, descriptions.get(item.link))),
      '',
    ]),
    '## Packages',
    '',
    ...plugins.map(plugin => line(plugin.name, `https://www.npmjs.com/package/${plugin.name}`, plugin.description)),
    '',
  ].join('\n')
}

function absoluteLinks(line, file, site) {
  return line.replace(/\]\((?!\w+:|\/|#)([^)\s]+?)\.md(#[^)]*)?\)/g, (_, path, hash = '') => {
    const target = posix.normalize(posix.join(posix.dirname(file), path)).replace(/(^|\/)index$/, '$1')
    return `](${site}/${target}${hash})`
  })
}

function stripComments(lines) {
  const out = []
  let fenced = false
  let open = false
  for (const line of lines) {
    if (/^\s*```/.test(line) && !open) {
      fenced = !fenced
    }
    if (fenced) {
      out.push(line)
      continue
    }
    let text = open ? `<!--${line}` : line
    text = text.replace(/<!--[\s\S]*?-->/g, '')
    open = text.includes('<!--')
    if (open) {
      text = text.slice(0, text.indexOf('<!--'))
    }
    if (text.trim() !== '' || line.trim() === '') {
      out.push(text)
    }
  }
  return out
}

/**
 * A page's markdown as an agent can use it outside the site: no frontmatter, no
 * `<script>`, `<style>` or `<audio>` the page runs, no HTML comment left for the next editor, and
 * relative `.md` links made absolute. Code samples are left exactly as written,
 * since a `<script>` inside one is the example.
 */
function pageText(source, file, site) {
  const lines = source.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n')
  const out = []
  let fenced = false
  let skipping
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced
    }
    if (!fenced && !skipping) {
      skipping = line.match(/^<(script|style|audio)\b/)?.[1]
    }
    if (skipping) {
      skipping = line.includes(`</${skipping}>`) ? undefined : skipping
      continue
    }
    out.push(fenced || /^\s*```/.test(line) ? line : absoluteLinks(line, file, site))
  }
  // Comments span lines, so they go once the fences are known to be untouched.
  return stripComments(out).join('\n').trim()
}

/**
 * The whole guide as one file, in the order `llms.txt` lists it, each page
 * under the address it is served at.
 *
 * @param {object} options
 * @param {string} options.site
 * @param {any[]} options.nav
 * @param {Record<string, any[]>} options.sidebar
 * @param {string} options.srcDir where the page sources live
 * @param {string} options.version
 */
function llmsFullTxt({ site, nav, sidebar, srcDir, version }) {
  const pages = llmsSections(nav, sidebar).flatMap(section => section.links).map((item) => {
    const file = `${item.link.replace(/^\//, '').replace(/(^|\/)$/, '$1index')}.md`
    return ['---', '', `Source: ${site}${item.link}`, '', pageText(readFileSync(join(srcDir, file), 'utf8'), file, site), '']
  })
  return [...preamble(nav, version), ...pages.flat()].join('\n')
}

module.exports = { llmsFullTxt, llmsTxt, publishedPlugins }
