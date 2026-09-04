import { describe, expect, it } from 'vitest'
import {
  declaredOrigins,
  deployMarker,
  documentTitles,
  liveTarget,
  missingRedirectTargets,
  pageUrlPath,
  parseRedirects,
  parseRedirectsFile,
  resolvesInBuild,
  robotsProblems,
  rulesBelowCatchAll,
  selfDeclarationProblems,
  sitemapGaps,
  sitemapLocations,
  staleHtmlTargets,
  svgTitles,
  titleProblems,
  unsafeCatchAlls,
} from './check-docs-site.ts'

const REDIRECTS = `
[build]
command = "pnpm docs:build"

# A comment that mentions from = "/decoy" and must not be parsed.
[[redirects]]
from = "/guide/vue3/*"
to = "/guide/vue/:splat"
status = 301

[[redirects]]
from = "/old-page.html"
to = "/new.html"
status = 301
`

describe('parseRedirects', () => {
  it('reads every rule in file order and ignores commented-out ones', () => {
    const redirects = parseRedirects(REDIRECTS)

    expect(redirects).toEqual([
      { from: '/guide/vue3/*', to: '/guide/vue/:splat', status: 301 },
      { from: '/old-page.html', to: '/new.html', status: 301 },
    ])
  })

  it('defaults a rule with no status to a permanent redirect', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/a"\nto = "/b"\n')

    expect(redirects[0].status).toBe(301)
  })
})

describe('unsafeCatchAlls', () => {
  it('flags a root catch-all that rewrites with a success status', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/*"\nto = "/index.html"\nstatus = 200\n')

    expect(unsafeCatchAlls(redirects)).toHaveLength(1)
  })

  it('flags a catch-all whose status is too malformed to read', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/*"\nto = "/index.html"\nstatus = "20O"\n')

    expect(unsafeCatchAlls(redirects)).toHaveLength(1)
  })

  it('accepts a root catch-all that answers 404', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/*"\nto = "/404.html"\nstatus = 404\n')

    expect(unsafeCatchAlls(redirects)).toEqual([])
  })

  it('accepts a root catch-all that redirects', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/*"\nto = "/"\nstatus = 301\n')

    expect(unsafeCatchAlls(redirects)).toEqual([])
  })

  it('accepts a narrower rewrite, which only shadows the paths it names', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/api/*"\nto = "/index.html"\nstatus = 200\n')

    expect(unsafeCatchAlls(redirects)).toEqual([])
  })
})

describe('parseRedirectsFile', () => {
  it('reads the _redirects line format Netlify also honours', () => {
    const redirects = parseRedirectsFile('# a comment\n\n/*  /index.html  200\n/old  /new\n')

    expect(redirects).toEqual([
      { from: '/*', to: '/index.html', status: 200 },
      { from: '/old', to: '/new', status: 301 },
    ])
  })

  it('reads a forced status, which Netlify writes with a trailing bang', () => {
    expect(parseRedirectsFile('/*  /index.html  200!')[0].status).toBe(200)
  })

  it('sees the soft 404 this project deleted from netlify.toml', () => {
    expect(unsafeCatchAlls(parseRedirectsFile('/*  /index.html  200\n'))).toHaveLength(1)
  })
})

describe('rulesBelowCatchAll', () => {
  it('flags a rule Netlify can never reach', () => {
    const redirects = parseRedirects(
      '[[redirects]]\nfrom = "/*"\nto = "/404.html"\nstatus = 404\n\n[[redirects]]\nfrom = "/guide/vue3/*"\nto = "/guide/vue/:splat"\nstatus = 301\n',
    )

    expect(rulesBelowCatchAll(redirects).map(r => r.from)).toEqual(['/guide/vue3/*'])
  })

  it('accepts the redirects sitting above the catch-all', () => {
    const redirects = parseRedirects(
      '[[redirects]]\nfrom = "/guide/vue3/*"\nto = "/guide/vue/:splat"\nstatus = 301\n\n[[redirects]]\nfrom = "/*"\nto = "/404.html"\nstatus = 404\n',
    )

    expect(rulesBelowCatchAll(redirects)).toEqual([])
  })
})

describe('missingRedirectTargets', () => {
  const built = new Set(['/', '/guide/vue', '/guide/vue/stories.html', '/new.html'])

  it('flags a splat target whose directory was renamed away', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/guide/vue3/*"\nto = "/guide/svelte4/:splat"\nstatus = 301\n')

    expect(missingRedirectTargets(redirects, built).map(r => r.to)).toEqual(['/guide/svelte4/:splat'])
  })

  it('accepts a splat target whose directory is in the build', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/guide/vue3/*"\nto = "/guide/vue/:splat"\nstatus = 301\n')

    expect(missingRedirectTargets(redirects, built)).toEqual([])
  })

  it('accepts a literal target that names a built page', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/quickstart"\nto = "/new.html"\nstatus = 301\n')

    expect(missingRedirectTargets(redirects, built)).toEqual([])
  })

  it('accepts a target that leaves the site, which no build can contain', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/chat"\nto = "https://chat.example/invite"\nstatus = 301\n')

    expect(missingRedirectTargets(redirects, built)).toEqual([])
  })

  it('accepts a target carrying an anchor, and resolves the page it names', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/sveltekit"\nto = "/guide/vue/stories.html#sveltekit"\nstatus = 301\n')

    expect(missingRedirectTargets(redirects, built)).toEqual([])
  })

  // The clean url is the address the site publishes and the one a redirect
  // should send a link to; the file on disk keeps its extension. Resolving only
  // the literal path reported the fix for #575 as a broken target.
  it('accepts a clean url whose page is on disk as .html', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/new"\nto = "/guide/vue/stories"\nstatus = 301\n')

    expect(missingRedirectTargets(redirects, built)).toEqual([])
  })

  it('accepts a clean url served by a directory index', () => {
    const withIndex = new Set([...built, '/guide/nuxt/index.html'])
    const redirects = parseRedirects('[[redirects]]\nfrom = "/nuxt"\nto = "/guide/nuxt"\nstatus = 301\n')

    expect(missingRedirectTargets(redirects, withIndex)).toEqual([])
  })

  it('still flags a clean url with no page behind it under any spelling', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/gone"\nto = "/guide/deleted"\nstatus = 301\n')

    expect(missingRedirectTargets(redirects, built).map(r => r.to)).toEqual(['/guide/deleted'])
  })
})

describe('resolvesInBuild', () => {
  const built = new Set(['/', '/guide/vue/stories.html', '/guide/nuxt/index.html'])

  it('resolves a path that is a file', () => {
    expect(resolvesInBuild('/guide/vue/stories.html', built)).toBe(true)
  })

  it('resolves a clean url by adding the extension, the way Netlify serves it', () => {
    expect(resolvesInBuild('/guide/vue/stories', built)).toBe(true)
  })

  it('resolves a clean url by its directory index', () => {
    expect(resolvesInBuild('/guide/nuxt', built)).toBe(true)
  })

  it('does not invent a page for a path with nothing behind it', () => {
    expect(resolvesInBuild('/guide/deleted', built)).toBe(false)
  })
})

describe('staleHtmlTargets', () => {
  // The defect: the target answered 200 and then declared a different canonical,
  // so the assertion above had nothing to say about it (#575).
  it('flags a target still naming the retired .html shape', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/new"\nto = "/guide/getting-started.html"\nstatus = 301\n')

    expect(staleHtmlTargets(redirects).map(r => r.from)).toEqual(['/new'])
  })

  it('is silent once the target is the clean url', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/new"\nto = "/guide/getting-started"\nstatus = 301\n')

    expect(staleHtmlTargets(redirects)).toEqual([])
  })

  it('says nothing about a .html page on someone else\'s site', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/rfc"\nto = "https://example.org/spec.html"\nstatus = 301\n')

    expect(staleHtmlTargets(redirects)).toEqual([])
  })

  it('leaves a splat target alone, since it names a directory', () => {
    const redirects = parseRedirects('[[redirects]]\nfrom = "/guide/vue3/*"\nto = "/guide/vue/:splat"\nstatus = 301\n')

    expect(staleHtmlTargets(redirects)).toEqual([])
  })
})

describe('robotsProblems', () => {
  it('flags the HTML page a missing robots.txt used to serve', () => {
    const problems = robotsProblems('<!DOCTYPE html>\n<html lang="en-US" dir="ltr">\n')

    expect(problems[0]).toMatch(/markup/)
  })

  it('flags rules that name no sitemap', () => {
    expect(robotsProblems('User-agent: *\nAllow: /\n')).toEqual([
      'robots.txt names no sitemap',
    ])
  })

  it('accepts the file the site actually ships', () => {
    expect(robotsProblems('User-agent: *\nAllow: /\n\nSitemap: https://poveste.dev/sitemap.xml\n')).toEqual([])
  })
})

// The sitemap lists the clean shape since #502, so the comparison is against the
// url a page is served at rather than the file it was built to.
describe('sitemapGaps', () => {
  const built = ['/index.html', '/guide/index.html', '/guide/css.html', '/404.html']

  it('reports a built page the sitemap does not list', () => {
    const { missing } = sitemapGaps(built, ['/', '/guide/'])

    expect(missing).toEqual(['/guide/css'])
  })

  it('reports a listed URL the build does not contain', () => {
    const { extra } = sitemapGaps(built, ['/', '/guide/', '/guide/css', '/guide/gone'])

    expect(extra).toEqual(['/guide/gone'])
  })

  it('reports the 404 page as extra, since advertising it invites indexing', () => {
    const { extra } = sitemapGaps(built, ['/', '/guide/', '/guide/css', '/404.html'])

    expect(extra).toEqual(['/404.html'])
  })

  it('accepts a sitemap that matches the build page for page', () => {
    expect(sitemapGaps(built, ['/', '/guide/', '/guide/css'])).toEqual({ missing: [], extra: [] })
  })

  // The `.html` twin Netlify still answers on is not what the sitemap lists.
  it('reports the extensioned shape as extra', () => {
    const { extra } = sitemapGaps(built, ['/', '/guide/', '/guide/css.html'])

    expect(extra).toEqual(['/guide/css.html'])
  })

  it('treats a page merely ending in index.html as a page, not an index', () => {
    expect(sitemapGaps(['/guide/myindex.html'], ['/guide/myindex'])).toEqual({ missing: [], extra: [] })
  })
})

describe('sitemapLocations', () => {
  it('reads every URL out of a single-line sitemap', () => {
    const xml = '<?xml version="1.0"?><urlset><url><loc>https://poveste.dev/</loc></url><url><loc>https://poveste.dev/new.html</loc></url></urlset>'

    expect(sitemapLocations(xml)).toEqual(['https://poveste.dev/', 'https://poveste.dev/new.html'])
  })
})

describe('declaredOrigins', () => {
  const robots = 'User-agent: *\n\nSitemap: https://poveste.dev/sitemap.xml\n'
  const config = `
    const SITE = 'https://poveste.dev'
    sitemap: { hostname: 'https://poveste.dev' },
    head: [
      ['meta', { property: 'og:image', content: 'https://poveste.dev/opengraph.png' }],
      ['link', { rel: 'canonical', href: 'https://github.com/poveste-dev/poveste' }],
    ],
  `

  it('finds the hostname in all four places it is declared', () => {
    expect(declaredOrigins(robots, config).map(d => d.where)).toEqual([
      'robots.txt Sitemap:',
      'config sitemap.hostname',
      'config SITE',
      'config og:image',
    ])
  })

  it('ignores unrelated URLs in the config', () => {
    const origins = declaredOrigins(robots, config).map(d => d.origin)

    expect(new Set(origins)).toEqual(new Set(['https://poveste.dev']))
  })

  it('finds a declaration written with double quotes', () => {
    const doubled = config.replace(`property: 'og:image', content: 'https://poveste.dev/opengraph.png'`, `property: "og:image", content: "https://poveste.dev/opengraph.png"`)

    expect(declaredOrigins(robots, doubled).map(d => d.where)).toContain('config og:image')
  })

  it('reports a relative url as having no origin instead of throwing', () => {
    const relative = config.replace(`content: 'https://poveste.dev/opengraph.png'`, `content: '/opengraph.png'`)
    const image = declaredOrigins(robots, relative).find(d => d.where === 'config og:image')

    expect(image).toEqual({ where: 'config og:image', url: '/opengraph.png', origin: undefined })
  })

  it('omits a declaration that is not there, so the caller can name it', () => {
    expect(declaredOrigins('User-agent: *\n', 'themeConfig: {}')).toEqual([])
  })

  it('separates a drifted declaration from the rest', () => {
    const drifted = config.replace(`hostname: 'https://poveste.dev'`, `hostname: 'https://www.poveste.dev'`)

    expect(declaredOrigins(robots, drifted).map(d => d.origin)).toEqual([
      'https://poveste.dev',
      'https://www.poveste.dev',
      'https://poveste.dev',
      'https://poveste.dev',
    ])
  })
})

describe('liveTarget', () => {
  it('defaults to production when --live carries no url', () => {
    expect(liveTarget(['node', 'check-docs-site.ts', '--live'])).toBe('https://poveste.dev')
  })

  it('takes a deploy preview url and drops its trailing slash', () => {
    expect(liveTarget(['node', 'check-docs-site.ts', '--live', 'https://deploy-preview-346--poveste.netlify.app/']))
      .toBe('https://deploy-preview-346--poveste.netlify.app')
  })

  it('does not read a following flag as a url', () => {
    expect(liveTarget(['node', 'check-docs-site.ts', '--live', '--verbose'])).toBe('https://poveste.dev')
  })

  it('does not read argv[0] as a url when --live is absent', () => {
    expect(liveTarget(['/usr/bin/node', 'scripts/check-docs-site.ts'])).toBe('https://poveste.dev')
  })
})

describe('deployMarker', () => {
  it('reads the branch, commit and context the build stamped in', () => {
    const html = '<head><meta name="poveste:deploy" content="main 21cb684 production"></head>'

    expect(deployMarker(html)).toBe('main 21cb684 production')
  })

  it('reads it with the attributes the other way round', () => {
    const html = '<head><meta content="main 21cb684 production" name="poveste:deploy"></head>'

    expect(deployMarker(html)).toBe('main 21cb684 production')
  })

  it('reads it from single-quoted attributes', () => {
    const html = `<head><meta name='poveste:deploy' content='main 21cb684 production'></head>`

    expect(deployMarker(html)).toBe('main 21cb684 production')
  })

  it('decodes a branch name the renderer had to escape', () => {
    const html = '<head><meta name="poveste:deploy" content="fix/a&amp;b abc1234 deploy-preview"></head>'

    expect(deployMarker(html)).toBe('fix/a&b abc1234 deploy-preview')
  })

  it('decodes an escaped ampersand once, not twice', () => {
    const html = '<head><meta name="poveste:deploy" content="a&amp;quot;b abc1234 production"></head>'

    expect(deployMarker(html)).toBe('a&quot;b abc1234 production')
  })

  it('is not fooled by another meta tag on the page', () => {
    const html = '<head><meta name="twitter:card" content="summary_large_image"><meta name="poveste:deploy" content="next abc1234 branch-deploy"></head>'

    expect(deployMarker(html)).toBe('next abc1234 branch-deploy')
  })

  it('returns nothing for a deploy made before the marker shipped', () => {
    expect(deployMarker('<head><title>Poveste</title></head>')).toBeUndefined()
  })
})

function page(path: string, canonical?: string, ogUrl = canonical) {
  return {
    path,
    html: [
      canonical && `<link rel="canonical" href="${canonical}">`,
      ogUrl && `<meta property="og:url" content="${ogUrl}">`,
    ].filter(Boolean).join(''),
  }
}

describe('the address a built page is served at', () => {
  it.each([
    ['/index.html', '/'],
    ['/guide/index.html', '/guide/'],
    ['/guide/getting-started.html', '/guide/getting-started'],
    // Only a whole segment is an index.
    ['/myindex.html', '/myindex'],
  ])('reads %s as %s', (built, url) => {
    expect(pageUrlPath(built)).toBe(url)
  })
})

describe('pages declaring their own address', () => {
  it('says nothing when each page states its own', () => {
    expect(selfDeclarationProblems([
      page('/index.html', 'https://poveste.dev/'),
      page('/guide/getting-started.html', 'https://poveste.dev/guide/getting-started'),
    ])).toEqual([])
  })

  // The defect itself: one `og:url` in the config, emitted on all 37 pages.
  it('reports pages that all claim the same address', () => {
    const problems = selfDeclarationProblems([
      page('/index.html', 'https://poveste.dev/'),
      page('/a.html', 'https://poveste.dev/'),
      page('/b.html', 'https://poveste.dev/'),
    ])

    expect(problems.some(p => p.includes('3 pages declare og:url https://poveste.dev/'))).toBe(true)
  })

  it('reports a page with no canonical', () => {
    expect(selfDeclarationProblems([page('/a.html', undefined, 'https://poveste.dev/a')]))
      .toEqual(['/a.html has no <link rel="canonical">, so nothing says which of its two urls counts'])
  })

  it('reports a canonical that names a different page', () => {
    expect(selfDeclarationProblems([page('/a.html', 'https://poveste.dev/b')]))
      .toEqual(['/a.html declares /b as its canonical, not /a'])
  })

  it('reports og:url and canonical disagreeing', () => {
    const problems = selfDeclarationProblems([
      page('/a.html', 'https://poveste.dev/a', 'https://poveste.dev/elsewhere'),
    ])

    expect(problems).toContain('/a.html declares og:url https://poveste.dev/elsewhere and canonical https://poveste.dev/a')
  })
})

// The nav, the mobile nav and the footer each render the social links, which is
// why one icon produced three titles rather than one (#571).
const ICON = '<a class="VPSocialLink" href="https://bsky.app/profile/poveste.dev" aria-label="Poveste on Bluesky"><svg role="img" viewBox="0 0 24 24"><title>Bluesky</title><path d="M12 10.8"/></svg></a>'
const DECORATIVE = '<a class="VPSocialLink" href="https://bsky.app/profile/poveste.dev" aria-label="Poveste on Bluesky"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 10.8"/></svg></a>'

function titled(body: string): string {
  return `<!DOCTYPE html><html><head><title>Getting started with Poveste | Poveste</title></head><body>${body}</body></html>`
}

describe('documentTitles', () => {
  it('reads the one title in the head', () => {
    expect(documentTitles(titled(''))).toEqual(['Getting started with Poveste | Poveste'])
  })

  // Valid markup: inside an <svg> the element is the icon's accessible name, not
  // the document's, and a conforming parser scopes it to the SVG namespace.
  it('does not count a title belonging to an svg', () => {
    expect(documentTitles(titled(ICON))).toEqual(['Getting started with Poveste | Poveste'])
  })

  it('reports a page that declares no title at all', () => {
    expect(documentTitles('<html><head></head><body></body></html>')).toEqual([])
  })
})

describe('svgTitles', () => {
  it('finds one per rendered icon, which is why three appeared per page', () => {
    expect(svgTitles(titled(ICON + ICON + ICON))).toEqual(['Bluesky', 'Bluesky', 'Bluesky'])
  })

  it('is silent once the icon is marked decorative', () => {
    expect(svgTitles(titled(DECORATIVE))).toEqual([])
  })

  it('does not mistake the document title for one', () => {
    expect(svgTitles(titled(''))).toEqual([])
  })
})

describe('titleProblems', () => {
  // The state that shipped: four <title> per page, three of them the icon's, and
  // Bing reporting the 7-character one as the page title (#571).
  it('names the icon titles and says what to do instead', () => {
    const problems = titleProblems([{ path: '/guide/getting-started.html', html: titled(ICON + ICON + ICON) }])

    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/3 <title> inside an <svg> \("Bluesky"\)/)
    expect(problems[0]).toMatch(/aria-hidden/)
  })

  it('is silent on the page as it is now built', () => {
    expect(titleProblems([{ path: '/guide/getting-started.html', html: titled(DECORATIVE) }])).toEqual([])
  })

  it('flags a second document title, which is the failure the svg one imitated', () => {
    const html = titled('').replace('</body>', '<title>Bluesky</title></body>')

    expect(titleProblems([{ path: '/index.html', html }])[0]).toMatch(/2 document titles/)
  })

  it('flags a page with no title', () => {
    expect(titleProblems([{ path: '/index.html', html: '<html><head></head><body></body></html>' }])[0])
      .toMatch(/has no <title>/)
  })

  it('checks every page, not just the first', () => {
    const problems = titleProblems([
      { path: '/index.html', html: titled(DECORATIVE) },
      { path: '/guide/getting-started.html', html: titled(ICON) },
    ])

    expect(problems.map(problem => problem.split(' ')[0])).toEqual(['/guide/getting-started.html'])
  })
})
