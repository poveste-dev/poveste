import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FLOORS } from './floors.ts'

const CHECKS = join(import.meta.dirname, '..')
const MODULES = readdirSync(CHECKS)
  .filter(file => file.endsWith('.ts') && !file.endsWith('.spec.ts'))
  .map(file => file.replace(/\.ts$/, ''))
  .sort()

function source(module: string, suffix = '.ts'): string {
  return readFileSync(join(CHECKS, `${module}${suffix}`), 'utf8')
}

// By import, not by name: a floor another module exports is read through its
// import line, and a filename says nothing about what a module uses (#773).
function usesWalkProblems(module: string): boolean {
  const text = source(module)
  return /export function walkProblems\b/.test(text) || /import \{[^}]*\bwalkProblems\b[^}]*\} from '\.\/[\w-]+\.ts'/.test(text)
}

const entries = Object.entries(FLOORS).map(([module, floor]) => ({ module, floor }))

describe('the floor record', () => {
  it('names every check under scripts/checks, and nothing else', () => {
    expect(Object.keys(FLOORS).sort()).toEqual(MODULES)
  })

  it.for(entries.filter(({ floor }) => 'walk' in floor))('$module exports or imports walkProblems', ({ module }) => {
    expect(usesWalkProblems(module)).toBe(true)
  })

  it.for(entries.filter(({ floor }) => 'sibling' in floor))('$module reads a check that carries a walk floor', ({ module, floor }) => {
    const sibling = (floor as { sibling: string }).sibling

    expect(source(module)).toMatch(new RegExp(`from '\\./${sibling}\\.ts'`))
    expect(FLOORS[sibling]).toEqual({ walk: true })
  })

  // In the spec as well as the module: a guard no spec reaches is a claim, and
  // a guard inside `main()` cannot be reached by one at all (#760).
  it.for(entries.filter(({ floor }) => 'guard' in floor))('$module reports its guard, and its spec asserts it', ({ module, floor }) => {
    const message = (floor as { guard: string }).guard

    // Unescaped: a message in a template literal writes its backticks as \`.
    expect(source(module).replaceAll('\\`', '`')).toContain(message)
    expect(source(module, '.spec.ts')).toContain(message)
  })

  it.for(entries.filter(({ floor }) => 'exempt' in floor))('$module is still exempt', ({ module, floor }) => {
    expect((floor as { exempt: string }).exempt).not.toHaveLength(0)
    expect(usesWalkProblems(module), 'it has a walk floor now, so the exemption is stale').toBe(false)
  })
})
