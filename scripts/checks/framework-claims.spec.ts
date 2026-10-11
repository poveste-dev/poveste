import { describe, expect, it } from 'vitest'
import { checkFrameworkClaims, denialsIn, hasGuide, pages } from './framework-claims.ts'
import { assertNoProblems } from './support/assert-no-problems.ts'
import { tree } from './support/fixture-tree.ts'

const GUIDES = {
  'docs/guide/react/getting-started.md': '# React',
  'docs/guide/solid/getting-started.md': '# Solid',
}

function frameworksDenied(markdown: string): string[] {
  return denialsIn('a.md', markdown).flatMap(denial => denial.frameworks)
}

describe('a sentence saying a framework has no plugin', () => {
  // The sentence the page carried, emphasis and all (#1284).
  it('is found in the form "Coming from Storybook" used', () => {
    expect(frameworksDenied('- **No React, Angular or Solid.** The plugin interface is public.'))
      .toEqual(['React', 'Angular', 'Solid'])
  })

  it.for([
    ['Angular, Preact, Lit and Qwik have no plugin, so their components cannot be written as stories.', ['Angular', 'Preact', 'Lit', 'Qwik']],
    ['There is no plugin for Angular or Qwik.', ['Angular', 'Qwik']],
    ['There is no Solid plugin yet.', ['Solid']],
    ['React is not supported.', ['React']],
    ['Angular and Lit are unsupported.', ['Angular', 'Lit']],
    ['Poveste does not support [React](https://react.dev).', ['React']],
  ] as const)('is found in "%s"', ([sentence, frameworks]) => {
    expect(frameworksDenied(sentence)).toEqual(frameworks)
  })

  it('is found across a hard-wrapped line', () => {
    expect(frameworksDenied('Angular and Lit have\nno plugin.')).toEqual(['Angular', 'Lit'])
  })

  it.for([
    'React has no controls panel.',
    'No controls panel for Solid or React.',
    'Solid and React cannot share a book yet.',
    'It covers Vue and Quasar — the last of which histoire does not support.',
    'No React component is rendered until the story is opened.',
    'React 18 is not supported.',
    'There is no plugin for React 18.',
  ])('is not read into "%s"', (sentence) => {
    expect(frameworksDenied(sentence)).toEqual([])
  })
})

describe('whether the framework is supported', () => {
  it('is decided by its guide, under the name the page used', () => {
    const root = tree(GUIDES)

    expect(hasGuide(root, 'React')).toBe(true)
    expect(hasGuide(root, 'SolidJS')).toBe(true)
    expect(hasGuide(root, 'Angular')).toBe(false)
  })
})

describe('the pages it reads', () => {
  it('are the docs, the root README and each package README', () => {
    const root = tree({
      'docs/guide/a.md': '',
      'docs/.vitepress/dist/b.md': '',
      'README.md': '',
      'packages/poveste/README.md': '',
      'packages/poveste-app/package.json': '{}',
    })

    expect(pages(root)).toEqual(['docs/guide/a.md', 'README.md', 'packages/poveste/README.md'])
  })
})

describe('the repository', () => {
  it('names no framework with a guide as having no plugin', { tags: ['check', 'docs'] }, () => {
    assertNoProblems(checkFrameworkClaims())
  })

  it('fails on a page denying a framework that has a guide, and names both', () => {
    const root = tree({ ...GUIDES, 'docs/guide/coming-from-storybook.md': '- **No React, Angular or Solid.**' })

    expect(checkFrameworkClaims(root).problems).toEqual([
      'docs/guide/coming-from-storybook.md says "No React, Angular or Solid", and React has a guide at docs/guide/react/getting-started.md',
      'docs/guide/coming-from-storybook.md says "No React, Angular or Solid", and Solid has a guide at docs/guide/solid/getting-started.md',
    ])
  })

  it('passes a page denying only frameworks with no guide', () => {
    const root = tree({ ...GUIDES, 'docs/guide/a.md': '- **No Angular, Preact, Lit or Qwik.**' })

    expect(checkFrameworkClaims(root).problems).toEqual([])
  })

  it('reports rather than passes when no page denies anything', () => {
    expect(checkFrameworkClaims(tree({ ...GUIDES, 'docs/guide/a.md': 'Stories are components.' })).problems)
      .toContainEqual(expect.stringContaining('no page names a framework without a plugin'))
  })
})
