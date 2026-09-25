// The conventions a control is written to, for the two of them a script can
// hold (#978). The rest are in `packages/poveste-controls/CONVENTIONS.md`.
//
// Two controls were on Reka when #955 was about to put ten more there, and they
// disagreed: one styled in a `<style>` block with semantic class names, the
// other with utilities in `class` and a variant map in script. Neither was
// wrong. Having both, with nothing written down, is what made the next ten a
// coin toss — and `data-slot` cannot be retrofitted cheaply once they ship
// without it.
//
// Assertions:
//   1. every control carries `data-slot` on the parts a consumer can reach
//   2. no opaque colour literal in a control's styles — those are tokens
//   3. no `dark:` inside an `@apply` — the one rule with a shipped bug behind it
//
// Both lists below are skip-lists with a reason each, in the style of
// `preview-position.ts`: a control nobody has classified fails rather than
// being assumed fine, which is what makes a *new* control meet the rule.

import type { CheckResult } from './support/check-result.ts'
import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')

export const CONTROLS = 'packages/poveste-controls/src/components'

/**
 * Controls #955 has not migrated yet. Each is still histoire's, and each leaves
 * this list when it moves onto a Reka primitive — that is the point of the
 * list rather than a general exemption.
 */
export const NOT_YET_MIGRATED = new Set([
  'HstColorSelect.vue',
  'HstDate.vue',
  'HstJson.vue',
  'HstColor.vue',
  'HstColorShades.vue',
  'HstTokenGrid.vue',
  'HstTokenList.vue',
  'HstCopyIcon.vue',
  'HstTooltip.vue',
  'HstWrapper.vue',
])

/** A hex, or an `rgb()`/`hsl()` with no alpha channel. */
const OPAQUE_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)\([^)/]*\)/gi

/**
 * A translucent literal is allowed and is not an oversight: a border wash or a
 * tooltip's scrim is not a colour a book themes, and bridging one would publish
 * a token no `theme.colors` would ever set.
 */
function opaqueLiterals(style: string): string[] {
  return [...style.matchAll(OPAQUE_LITERAL)].map(match => match[0])
}

/**
 * Comments go first, and that is not tidiness: this codebase cites issues as
 * `(#101)`, and `#101` is a three-digit hex to any regex looking for one.
 */
function styleBlocks(source: string): string {
  return [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map(block => block[1])
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * A `dark:` variant inside `@apply`, which CONVENTIONS.md rule 3 forbids.
 *
 * The rule was written against `@scope`: `.ptw-dark` sits above the scope root,
 * so a descendant rule keyed on it never matches. `HstSlider` then found a
 * second way for the same line to fail, and this is the one that had actually
 * shipped. `@apply ... dark:bg-gray-700` inside a `::-webkit-slider-thumb`
 * block compiled to
 *
 *   .range-input::-webkit-slider-thumb:where(.ptw-dark, .ptw-dark *)
 *
 * and nothing may follow a pseudo-element but a user-action pseudo-class.
 * Chrome does not drop the rule, because `:where()` is forgiving — it discards
 * the arguments and keeps `:where()`, which matches nothing. So six rules sat
 * in the stylesheet, visible in devtools, applying to no element, and the thumb
 * stayed white on a dark UI for the life of the control.
 *
 * Neither failure announces itself, and the two have different mechanisms, so
 * the rule is on the form rather than on either mechanism.
 */
const APPLY_WITH_DARK = /@apply[^;}]*\sdark:/g

function darkInsideApply(style: string): string[] {
  return [...style.matchAll(APPLY_WITH_DARK)].map(match => match[0].trim())
}

function templateBlock(source: string): string {
  return [...source.matchAll(/<template>([\s\S]*?)<\/template>/g)].map(block => block[1]).join('\n')
}

export function problemsIn(files: { file: string, source: string }[]): string[] {
  const problems: string[] = []

  for (const { file, source } of files) {
    const name = file.split('/').pop()!

    if (NOT_YET_MIGRATED.has(name)) {
      continue
    }

    const template = templateBlock(source)

    // A control with no template of its own has no part to name.
    if (template.trim() && !template.includes('data-slot')) {
      problems.push(`${file}: no \`data-slot\` on any part, so a consumer has only our class names to target`)
    }

    const style = styleBlocks(source)
    const literals = opaqueLiterals(style)

    if (literals.length) {
      problems.push(`${file}: opaque colour literal ${literals.map(l => `\`${l}\``).join(', ')} — no book can theme that`)
    }

    if (darkInsideApply(style).length) {
      problems.push(`${file}: a \`dark:\` variant inside \`@apply\`, which compiles to a selector that matches nothing and says so nowhere`)
    }
  }

  return problems
}

function repositoryProblems(root = ROOT): string[] {
  const files = globSync(`${CONTROLS}/**/*.vue`, { cwd: root })
    .filter(file => !file.endsWith('.story.vue'))
    .map(file => ({ file, source: readFileSync(join(root, file), 'utf8') }))

  if (files.length === 0) {
    return [`no controls found under ${CONTROLS} — this check is looking in the wrong place`]
  }

  const migrated = files.filter(({ file }) => !NOT_YET_MIGRATED.has(file.split('/').pop()!))

  if (migrated.length === 0) {
    return ['every control is on the not-yet-migrated list — this check is asserting nothing']
  }

  return problemsIn(files)
}

const REMEDY = 'See packages/poveste-controls/CONVENTIONS.md. A part a consumer can reach carries `data-slot="<part>"`, a colour comes from `var(--color-…)` rather than a literal, and dark mode is written as `&:where(.ptw-dark, .ptw-dark *)` in CSS rather than as a `dark:` variant inside `@apply` — `@scope` removes a consumer\'s CSS from our markup, so the attribute is the only seam they have.'

export function checkControlConventions(root = ROOT): CheckResult {
  return { problems: repositoryProblems(root), remedy: REMEDY, notes: [] }
}
