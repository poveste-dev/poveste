import type { A11yResult } from './a11y.js'
import axe from 'axe-core/axe.min.js'
import { isTransparent } from './a11y.js'

// The hidden mount that collects the story's variants, not what the reader sees.
const EXCLUDE = [['.__poveste-sandbox-hidden']]

function target(selector: axe.UnlabelledFrameSelector): string {
  return selector.map(part => Array.isArray(part) ? part.join(' >>> ') : part).join(' ')
}

/**
 * Paints the colour the app shows behind the sandbox onto its root, for the run.
 * It is the colour already showing through, so nothing visibly changes; a book
 * that paints its own background keeps it.
 */
function paintBackground(background: string | undefined): () => void {
  const root = document.documentElement
  if (!background || !isTransparent(getComputedStyle(root).backgroundColor) || !isTransparent(getComputedStyle(document.body).backgroundColor)) {
    return () => {}
  }
  const previous = root.style.backgroundColor
  root.style.backgroundColor = background
  return () => {
    root.style.backgroundColor = previous
  }
}

/**
 * axe-core over this sandbox document. Only ever reached through a dynamic import:
 * in the sandbox's static graph axe costs every realm about 38 ms to evaluate,
 * which took a 40-variant grid from 0.7 s to 3.3 s (#162).
 */
export async function runA11y(disabledRules: string[], background: string | undefined): Promise<A11yResult> {
  // A framework may render a change as a task of its own, after the state that caused it.
  await new Promise(resolve => setTimeout(resolve))

  const known = new Set(axe.getRules().map(rule => rule.ruleId))
  const rules: axe.RuleObject = {}
  for (const id of disabledRules) {
    if (known.has(id)) {
      rules[id] = { enabled: false }
    }
  }

  const restore = paintBackground(background)
  try {
    const results = await axe.run({ exclude: EXCLUDE }, {
      rules,
      resultTypes: ['violations'],
      // A frame a component renders would be waited on for an axe that is not in it.
      iframes: false,
    })
    return {
      engine: axe.version,
      violations: results.violations.map(violation => ({
        id: violation.id,
        impact: violation.impact ?? null,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map(node => ({
          target: target(node.target),
          html: node.html,
          summary: node.failureSummary ?? '',
        })),
      })),
      passes: results.passes.length,
      unknownRules: disabledRules.filter(id => !known.has(id)),
    }
  }
  finally {
    restore()
  }
}
