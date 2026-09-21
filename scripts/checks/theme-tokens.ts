// The chrome's tokens and the colours a book resolves at runtime have to name the
// same variables, in both directions (#955).
//
// `packages/poveste-controls/src/style/tokens.css` bridges every themable token
// to `--_poveste-color-<name>-<key>`, which `resolved-theme.ts` injects per book
// from `theme.colors`. Nothing connects the two but the spelling: a token that
// bridges to a variable no config supplies is a permanent fallback that looks
// configurable, and a colour the config supplies that no token reads is dead
// weight in every book. Neither shows up as an error anywhere — the first one is
// what this file was written for, after the controls package spent a release
// painting Tailwind's emerald while every book painted the configured one.

import type { CheckResult } from './support/check-result.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')

export const TOKENS_FILE = 'packages/poveste-controls/src/style/tokens.css'
export const COLORS_FILE = 'packages/poveste/src/node/colors.ts'
export const CONFIG_FILE = 'packages/poveste/src/node/config.ts'

/** `--color-primary-500: var(--_poveste-color-primary-500, #10b981);` */
// The fallback may be a function — `hsl(…)`, `color-mix(…)` — so it is read to
// one level of nesting rather than to the first `)`.
const BRIDGED = /--color-(\w+)-(\d+):\s*var\(--_poveste-color-\1-\2(?:,((?:[^()]|\([^()]*\))+))?\)/g

/** The stylesheets that have to read the tokens for them to exist at all. */
export const IMPORTERS = [
  'packages/poveste-controls/src/style/main.css',
  'packages/poveste-app/src/app/style/main.pcss',
]

const IMPORTS_TOKENS = /@import\s+'[^']*tokens\.css'/

export interface Bridge { name: string, key: string, fallback: string | undefined }

export function bridges(css: string): Bridge[] {
  return [...css.matchAll(BRIDGED)].map(([, name, key, fallback]) => ({
    name: name!,
    key: key!,
    fallback: fallback?.trim(),
  }))
}

/**
 * Which palette each themable name defaults to, read off the config rather than
 * repeated here — `primary: defaultColors.emerald` and its sibling are the only
 * place that pairing exists.
 */
export function defaultPalettes(configSource: string): Record<string, string> {
  const block = /colors:\s*\{([^}]*)\}/.exec(configSource)
  if (!block) {
    return {}
  }
  return Object.fromEntries([...block[1]!.matchAll(/(\w+):\s*defaultColors\.(\w+)/g)].map(([, name, palette]) => [name!, palette!]))
}

/** The shades a palette in `colors.ts` defines, as `{ '500': '#10b981' }`. */
export function palette(colorsSource: string, name: string): Record<string, string> {
  const block = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`).exec(colorsSource)
  if (!block) {
    return {}
  }
  return Object.fromEntries([...block[1]!.matchAll(/(\d+):\s*'(#[\da-f]{3,8})'/gi)].map(([, key, hex]) => [key!, hex!]))
}

/*
 * A file that reads the tokens. Its own build is the only thing that notices
 * when it stops, and only one of the two notices at all: `@poveste/controls`
 * has an `@apply` in its entry that stops resolving, so its build exits 1, and
 * `@poveste/app` has none — drop the import there and `pnpm --filter
 * @poveste/app build` exits 0 with a `dist/style.css` carrying no chrome colour
 * at all. Measured, and the reason this check exists rather than trusting the
 * builds (#955).
 */
export function importProblems(file: string, source: string): string[] {
  return IMPORTS_TOKENS.test(source)
    ? []
    : [`${file} does not import ${TOKENS_FILE}, so nothing defines the chrome's colours in its build — and only one of the two builds fails when that happens`]
}

export function tokenProblems(tokens: string, colorsSource: string, configSource: string): string[] {
  const problems: string[] = []
  const palettes = defaultPalettes(configSource)
  if (Object.keys(palettes).length === 0) {
    return [`could not read which palettes \`theme.colors\` defaults to from ${CONFIG_FILE}`]
  }

  const bridged = bridges(tokens)
  if (bridged.length === 0) {
    return [`${TOKENS_FILE} bridges no token to \`--_poveste-color-*\``]
  }

  for (const [name, source] of Object.entries(palettes)) {
    const shades = palette(colorsSource, source)
    if (Object.keys(shades).length === 0) {
      problems.push(`\`defaultColors.${source}\`, which \`theme.colors.${name}\` defaults to, is not in ${COLORS_FILE}`)
      continue
    }

    const here = bridged.filter(bridge => bridge.name === name)
    for (const key of Object.keys(shades)) {
      if (!here.some(bridge => bridge.key === key)) {
        problems.push(`\`theme.colors.${name}.${key}\` is resolved per book and no token reads it — add --color-${name}-${key} to ${TOKENS_FILE}`)
      }
    }
    for (const bridge of here) {
      if (!(bridge.key in shades)) {
        problems.push(`--color-${name}-${bridge.key} bridges to \`--_poveste-color-${name}-${bridge.key}\`, which no configuration supplies — it can only ever be its fallback`)
        continue
      }
      const expected = shades[bridge.key]!
      if (bridge.fallback === undefined) {
        problems.push(`--color-${name}-${bridge.key} has no fallback, so it is nothing at all wherever the book does not inject one — expected \`${expected}\``)
      }
      else if (bridge.fallback !== expected) {
        problems.push(`--color-${name}-${bridge.key} falls back to \`${bridge.fallback}\` where \`defaultColors.${source}.${bridge.key}\` is \`${expected}\``)
      }
    }
  }

  return problems
}

const REMEDY = `The fallbacks in ${TOKENS_FILE} are the values \`getDefaultConfig()\` puts in \`theme.colors\`, as space-separated RGB channels. Regenerate them from ${COLORS_FILE} rather than by hand.`

export function checkThemeTokens(root = ROOT): CheckResult {
  const read = (file: string) => readFileSync(join(root, file), 'utf8')
  return {
    problems: [
      ...tokenProblems(read(TOKENS_FILE), read(COLORS_FILE), read(CONFIG_FILE)),
      ...IMPORTERS.flatMap(file => importProblems(file, read(file))),
    ],
    remedy: REMEDY,
    notes: [],
  }
}
