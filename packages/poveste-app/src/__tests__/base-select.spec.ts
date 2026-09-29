import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * The same defect as `@poveste/controls`' own select, in the chrome's copy: the
 * options are portalled to `body`, which carries no colour, so a background
 * without a text colour left them at the UA default — black on the dark panel.
 *
 * `__dirname` rather than `import.meta.url`, which vitest's transform does not
 * leave intact here — the trap `icons.spec.ts` records.
 */
const source = readFileSync(resolve(__dirname, '../app/components/base/BaseSelect.vue'), 'utf8')

describe('the chrome select options', () => {
  const classes = /class="poveste-base-select-options([^"]*)"/.exec(source)?.[1] ?? ''

  it('carries a text colour, not only a background', () => {
    expect(classes).toMatch(/\btext-gray-\d+\b/)
  })

  it('carries one for dark as well', () => {
    expect(classes).toMatch(/\bdark:text-gray-\d+\b/)
  })
})
