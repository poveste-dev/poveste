// Every component a book registers for its stories, named in the reference on
// both controls guides.
//
// The guides showed two controls and sent the reader to the package's source
// directory for the rest, and the two controls new in 0.16.0 were named nowhere
// in the docs (#1033). The list here is read from the package, so a control
// added to it fails until both guides name it.

import type { CheckResult } from './support/check-result.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')

export const CONTROLS_INDEX = join('packages', 'poveste-controls', 'src', 'index.ts')

/** Each guide, and how a story names a component there. */
export const GUIDES: { file: string, name: (component: string) => string }[] = [
  { file: join('docs', 'guide', 'vue', 'controls.md'), name: component => component },
  { file: join('docs', 'guide', 'svelte', 'controls.md'), name: component => `Hst.${component.replace(/^Hst/, '')}` },
]

/** The keys of the package's `components` object: what a book registers. */
export function registeredComponents(index: string): string[] {
  const body = /export const components = \{([^}]*)\}/.exec(index)?.[1]
  return body === undefined ? [] : [...body.matchAll(/\b(Hst\w+)\b/g)].map(match => match[1] ?? '')
}

export function referenceProblems(components: string[], guides: { file: string, text: string, name: (component: string) => string }[]): string[] {
  if (components.length === 0) {
    return [`${CONTROLS_INDEX} has no \`components\` object this check can read`]
  }
  return guides.flatMap(guide => components
    .filter(component => !guide.text.includes(`\`${guide.name(component)}\``))
    .map(component => `${guide.file} does not name \`${guide.name(component)}\`, which ${CONTROLS_INDEX} registers for stories`))
}

export function checkControlsReference(root = ROOT): CheckResult {
  const components = registeredComponents(readFileSync(join(root, CONTROLS_INDEX), 'utf8'))
  const guides = GUIDES.map(guide => ({ ...guide, text: readFileSync(join(root, guide.file), 'utf8') }))
  return {
    problems: referenceProblems(components, guides),
    remedy: 'Add the component to the "Every builtin control" tables in both controls guides.',
    notes: [`${components.length} components registered for stories, checked in ${guides.length} guides`],
  }
}
