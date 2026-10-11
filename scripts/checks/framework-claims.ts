// Fails when a page says a framework has no plugin while the docs carry a guide
// for it.
//
// "Coming from Storybook" opened its list of limits with "No React, Angular or
// Solid" and sent React users to another tool. It was false for Solid from
// 0.18.0 and would have been false for React from 0.19.0, and neither plugin's
// PR touched the page, because nothing connects a sentence to the plugin that
// makes it untrue (#1284).
//
// A framework counts as supported when `docs/guide/<name>/getting-started.md`
// exists, so there is no list here to keep: the guide a plugin ships with is
// what turns an old denial into a failure.
//
// It reads a few written forms of "has no plugin", not meaning. A denial in
// other words passes, which is why the floor below matters: if no page matches
// any form, the forms have drifted from how the docs write it.

import type { CheckResult } from './support/check-result.ts'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { markdownFiles } from './docs-vue-fences.ts'
import { captured } from './support/captured.ts'

const ROOT = join(import.meta.dirname, '..', '..')

// A name with a version after it is a statement about that version: "React 18 is
// not supported" is true on a page that supports React 19.
const NAME = String.raw`[A-Z][A-Za-z]+(?![A-Za-z]| \d)`
const LIST = String.raw`${NAME}(?:, ${NAME})*(?:,? (?:or|and|nor) ${NAME})?`

const DENIALS = [
  // "No React, Angular or Solid." and "no Solid plugin"
  new RegExp(String.raw`\b[Nn]o (${LIST})(?= (?:plugin|support)\b|[.:!]|$)`, 'g'),
  new RegExp(String.raw`\b[Nn]o (?:plugin|support) for (${LIST})`, 'g'),
  new RegExp(String.raw`\b(${LIST}) (?:has|have) no (?:plugin|support)\b`, 'g'),
  new RegExp(String.raw`\b(${LIST}) (?:is|are)(?: not |n't | un)supported\b`, 'g'),
  new RegExp(String.raw`\b[Pp]oveste (?:does not|doesn't) support (${LIST})`, 'g'),
]

/** Names a page writes differently from the framework's guide directory. */
const GUIDE_OF: Record<string, string> = { solidjs: 'solid' }

export interface Denial {
  file: string
  /** The words that matched, as the page has them. */
  phrase: string
  frameworks: string[]
}

/** Emphasis, code ticks and link targets sit between the words a form looks for. */
function plain(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/(?<!\n)\n(?!\n)/g, ' ')
}

export function denialsIn(file: string, markdown: string): Denial[] {
  const text = plain(markdown)
  return DENIALS.flatMap(form => [...text.matchAll(form)].map(match => ({
    file,
    phrase: match[0],
    frameworks: captured(match).split(/,? (?:or|and|nor) |, /),
  })))
}

export function guideOf(framework: string): string {
  const name = framework.toLowerCase()
  return GUIDE_OF[name] ?? name
}

export function hasGuide(root: string, framework: string): boolean {
  return existsSync(join(root, 'docs', 'guide', guideOf(framework), 'getting-started.md'))
}

/** The docs, the root README and each package's, which is its page on npm. */
export function pages(root: string): string[] {
  const packages = join(root, 'packages')
  const readmes = existsSync(packages)
    ? readdirSync(packages).map(dir => join('packages', dir, 'README.md'))
    : []
  return [...markdownFiles(root), 'README.md', ...readmes].filter(file => existsSync(join(root, file)))
}

function repositoryProblems(root: string): string[] {
  const denials = pages(root).flatMap(file => denialsIn(file, readFileSync(join(root, file), 'utf8')))

  if (denials.length === 0) {
    return ['no page names a framework without a plugin — this check is matching nothing']
  }

  return denials.flatMap(({ file, phrase, frameworks }) => frameworks
    .filter(framework => hasGuide(root, framework))
    .map(framework => `${file} says "${phrase}", and ${framework} has a guide at docs/guide/${guideOf(framework)}/getting-started.md`))
}

const REMEDY = 'Say what the framework\'s plugin does instead. A plugin that does less than the others is "renderer only" wherever it is listed, as `QUALIFIED` in docs/.vitepress/llms.js has it.'

export function checkFrameworkClaims(root = ROOT): CheckResult {
  return { problems: repositoryProblems(root), remedy: REMEDY, notes: [] }
}
