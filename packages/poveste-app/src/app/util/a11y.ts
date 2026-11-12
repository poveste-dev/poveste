import type { A11yOptions } from '@poveste/shared'
import { shallowReactive } from 'vue'

/**
 * The axe-core rules the sandbox never runs, and why.
 *
 * Each asks whether a document is a well-formed page. A sandbox document renders
 * one component, and the page that component is placed in is what answers them:
 * asked of the sandbox, they fail for every story in every book, about nothing the
 * story can change (#310).
 *
 * The rest of axe's rules about the document stay on: `html-has-lang`,
 * `document-title`, `meta-viewport`, `aria-hidden-body` and the landmark rules
 * that judge landmarks a component renders. Poveste writes the sandbox document
 * and passes them (#299), and `e2e/a11y-panel.spec.ts` holds it to that.
 */
export const SANDBOX_DISABLED_RULES: Readonly<Record<string, string>> = {
  'landmark-one-main': 'A page has one main landmark. A component sits inside the page\'s, and one of its own would be the defect.',
  'page-has-heading-one': 'A page has a level-one heading. The level a component\'s heading takes depends on where the page puts it.',
  'region': 'A page keeps its content inside landmarks. A component rendered alone is outside them by construction; the page it is placed in provides them.',
  'bypass': 'A page offers a way past the blocks it repeats, such as a skip link. That belongs to the page\'s layout, not to a component.',
}

export interface A11yNode {
  /** A CSS selector for the element, as axe gives it. */
  target: string
  /** The element's opening markup. */
  html: string
  /** What axe says to fix. */
  summary: string
}

export interface A11yViolation {
  id: string
  impact: string | null
  help: string
  helpUrl: string
  nodes: A11yNode[]
}

export interface A11yResult {
  /** The axe-core version that ran. */
  engine: string
  violations: A11yViolation[]
  /** How many rules found nothing wrong. */
  passes: number
  /** Disabled rule ids axe does not have, so nothing was skipped for them. */
  unknownRules: string[]
}

/** Runs the check in the realm that renders the variant, with these rules off. */
export type A11yRunner = (disabledRules: string[]) => Promise<A11yResult>

/** The rules a story's check skips, by who turned each off. */
export interface DisabledRules {
  sandbox: string[]
  book: string[]
  story: string[]
}

export function disabledRules(book: A11yOptions | undefined, story: A11yOptions | undefined): DisabledRules {
  return {
    sandbox: Object.keys(SANDBOX_DISABLED_RULES),
    book: book?.disableRules ?? [],
    story: story?.disableRules ?? [],
  }
}

export function allDisabled(rules: DisabledRules): string[] {
  return [...new Set([...rules.sandbox, ...rules.book, ...rules.story])]
}

/** A computed colour with nothing painted: `transparent`, or any alpha of zero. */
export function isTransparent(color: string): boolean {
  return color === 'transparent' || /^rgba\([^)]*,\s*0\)$/.test(color) || /\/\s*0\)$/.test(color)
}

/**
 * The colour painted behind an element: its nearest ancestor's background.
 *
 * The sandbox document is transparent and the app paints the preview's background
 * around it, so axe, which sees only the sandbox, measured every contrast against
 * white. Light text on a dark preview read as 1:1.
 */
export function backgroundBehind(element: Element | null | undefined): string | undefined {
  for (let ancestor = element?.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const color = getComputedStyle(ancestor).backgroundColor
    if (!isTransparent(color)) {
      return color
    }
  }
  return undefined
}

// Each mounted sandbox preview offers a runner for the variant it shows, and the
// panel asks the one for the selected variant. In a grid that is one cell of many.
const runners = shallowReactive(new Map<string, A11yRunner>())

function key(storyId: string, variantId: string) {
  return JSON.stringify([storyId, variantId])
}

/** Offers a runner for a variant, until the function it returns is called. */
export function provideA11yRunner(storyId: string, variantId: string, runner: A11yRunner): () => void {
  const id = key(storyId, variantId)
  runners.set(id, runner)
  return () => {
    if (runners.get(id) === runner) {
      runners.delete(id)
    }
  }
}

export function a11yRunnerFor(storyId: string, variantId: string): A11yRunner | undefined {
  return runners.get(key(storyId, variantId))
}
