// Builds `/llms.txt`, the plain-text map of the docs that an agent reads instead of
// crawling (#1127). Everything in it comes from somewhere the site already keeps
// current: the pages from the nav and sidebar, each line from the page's own
// `description`, the plugins from the workspace manifests. A hand-written list is
// what drifts, and `pnpm run test:docs-site` holds the result to the build.

const { readdirSync, readFileSync } = require('node:fs')
const { join } = require('node:path')

// Named only while no plugin exists for it: a framework that gains a nav entry
// drops out of this sentence on its own.
const UNSUPPORTED = ['React', 'Angular', 'Preact', 'Lit', 'Qwik']

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
 * @param {object} options
 * @param {string} options.site the origin pages are linked under
 * @param {any[]} options.nav `themeConfig.nav`
 * @param {Record<string, any[]>} options.sidebar `themeConfig.sidebar`
 * @param {Map<string, string>} options.descriptions page path, as linked, to its `description`
 * @param {{ name: string, description?: string }[]} options.plugins
 * @param {string} options.version
 */
function llmsTxt({ site, nav, sidebar, descriptions, plugins, version }) {
  const frameworks = navGroup(nav, 'Frameworks')
  const supported = frameworks.items.map(item => item.text)
  const unsupported = UNSUPPORTED.filter(name => !supported.includes(name))

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

  const line = (text, url, description) => `- [${text}](${url})${description ? `: ${description}` : ''}`

  return [
    '# Poveste',
    '',
    '> Interactive component playgrounds, built with Vite from story files: a maintained, drop-in fork of histoire.',
    '',
    `Supported frameworks: ${list(supported)}.${unsupported.length ? ` ${list(unsupported)} have no plugin, so their components cannot be written as stories.` : ''}`,
    '',
    `Current version: ${version}. Install \`poveste\` and the plugin for your framework at the same version.`,
    '',
    ...sections.flatMap(({ title, links }) => [
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

module.exports = { llmsTxt, publishedPlugins }
