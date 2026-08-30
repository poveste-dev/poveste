import { describe, expect, it } from 'vitest'
import { aliasesTaughtAlone, externalHosts, instructsWithHistoire, referencedWorkflows } from './check-readmes.ts'

// The heuristics below are the whole guard. Each case here is one that got
// past an earlier version of it, so a regression is a defect shipping again
// rather than a style change.

describe('instructsWithHistoire', () => {
  it('flags the instruction that shipped on two npm pages', () => {
    expect(instructsWithHistoire('Add the plugin in histoire config:')).toEqual([
      'Add the plugin in histoire config:',
    ])
  })

  it('flags it when the name is written in backticks', () => {
    // Stripping inline code hid this, which is the #294 defect one backtick away.
    expect(instructsWithHistoire('Add the plugin in `histoire` config:')).toHaveLength(1)
  })

  it('flags an instruction that also names a config file', () => {
    // Excluding any line containing `.config` switched the assertion off for
    // most configuration instructions, which is most of them.
    expect(instructsWithHistoire('Configure histoire in vite.config.ts')).toHaveLength(1)
  })

  it('allows the successor framing', () => {
    expect(instructsWithHistoire('Coming from histoire? Swap the dependency and add the plugin')).toEqual([])
  })

  // The word the project frames itself with, since #487 stopped it saying
  // "successor" about a project that is still shipping.
  it('allows the fork framing', () => {
    expect(instructsWithHistoire('This fork keeps the plugin you add in histoire working')).toEqual([])
  })

  it('allows the supported histoire.config.* filename', () => {
    expect(instructsWithHistoire('Add nothing: your histoire.config.ts keeps working')).toEqual([])
  })

  it('allows migration prose', () => {
    expect(instructsWithHistoire('To migrate, install poveste and configure it as histoire was')).toEqual([])
  })

  it('ignores fenced code, which the fence assertion covers', () => {
    expect(instructsWithHistoire('```sh\npnpm add histoire\n```')).toEqual([])
  })
})

describe('referencedWorkflows', () => {
  it('finds the workflow a badge names, once', () => {
    const badge = '[![Test](https://github.com/o/r/actions/workflows/test.yml/badge.svg)]'
      + '(https://github.com/o/r/actions/workflows/test.yml)'

    expect(referencedWorkflows(badge)).toEqual(['test.yml'])
  })

  it('ignores a workflow named inside a code fence', () => {
    // A README showing a consumer how to run Poveste in CI names workflows in
    // their repo, not this one.
    expect(referencedWorkflows('```yaml\n# .github/workflows/ci.yml\n```')).toEqual([])
  })
})

describe('externalHosts', () => {
  it('drops the punctuation that ends a sentence', () => {
    // `vite.dev,` is not `vite.dev`, and the allowlist only knows the latter.
    expect(externalHosts('See https://vite.dev, then https://vite.dev.')).toEqual(['vite.dev'])
  })

  it('skips a loopback example nobody follows', () => {
    expect(externalHosts('open http://localhost:3000')).toEqual([])
  })

  it('reads the host out of a markdown link', () => {
    expect(externalHosts('[docs](https://poveste.dev/guide/index.html)')).toEqual(['poveste.dev'])
  })
})

describe('aliasesTaughtAlone', () => {
  it('flags a page that teaches only the deprecated spelling', () => {
    expect(aliasesTaughtAlone('set process.env.HISTOIRE to true')).toEqual([
      { line: 1, deprecated: 'process.env.HISTOIRE', canonical: 'process.env.POVESTE' },
    ])
  })

  it('passes a line that records the alias beside the canonical name', () => {
    expect(aliasesTaughtAlone('use process.env.POVESTE; process.env.HISTOIRE still works')).toEqual([])
  })

  it('flags a code sample on the alias even when prose elsewhere names the canonical', () => {
    const page = [
      'Use the `process.env.POVESTE` environment variable.',
      '',
      '```ts',
      'port: process.env.HISTOIRE ? 6006 : 3000,',
      '```',
    ].join('\n')

    expect(aliasesTaughtAlone(page)).toEqual([
      { line: 4, deprecated: 'process.env.HISTOIRE', canonical: 'process.env.POVESTE' },
    ])
  })

  it('reports the line so the sample can be found', () => {
    const page = 'intro\n\ncolor: var(--histoire-contrast-color);\n'

    expect(aliasesTaughtAlone(page)).toEqual([
      { line: 3, deprecated: '--histoire-contrast-color', canonical: '--poveste-contrast-color' },
    ])
  })

  it('passes the migration table, which names both on one row', () => {
    const row = '| `--histoire-contrast-color` CSS var | still set (alongside `--poveste-contrast-color`) |'

    expect(aliasesTaughtAlone(row)).toEqual([])
  })
})
