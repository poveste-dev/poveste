import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { clientConfig } from '../virtual/resolved-config.js'

const APP = path.resolve(__dirname, '../../../../poveste-app/src')

/** Every `povesteConfig.a` and `povesteConfig.a.b` the app reads, optional chaining included. */
function readByTheApp() {
  const reads = new Set<string>()
  for (const file of readdirSync(APP, { recursive: true, encoding: 'utf8' })) {
    if (!/\.(?:ts|vue)$/.test(file) || /\.spec\.ts$/.test(file)) {
      continue
    }
    const source = readFileSync(path.join(APP, file), 'utf8')
    for (const [, first, second] of source.matchAll(/povesteConfig\??\.(\w+)(?:\??\.(\w+))?/g)) {
      reads.add(first === 'theme' && second ? `theme.${second}` : first!)
    }
    for (const [, names] of source.matchAll(/const \{([^}]+)\} = povesteConfig\.theme\b/g)) {
      names!.split(',').forEach(name => reads.add(`theme.${name.trim()}`))
    }
  }
  return [...reads].sort()
}

// The browser is sent only these fields (#1383). One the app reads and the list
// leaves out arrives as undefined, which no build error would report.
describe('the config the browser is sent', () => {
  it('has every field the app reads', () => {
    const sent = clientConfig({} as Parameters<typeof clientConfig>[0])
    const has = (read: string) => read.startsWith('theme.') ? read.slice(6) in sent.theme : read in sent

    expect(readByTheApp().filter(read => !has(read))).toEqual([])
  })

  it('finds the app\'s reads, so the check above is not passing on nothing', () => {
    expect(readByTheApp()).toEqual(expect.arrayContaining(['routerMode', 'backgroundPresets', 'theme.title', 'theme.darkClass']))
  })
})
