import type { Variant } from '@poveste/shared'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { delimitAttr, generateSourceCode } from '../codegen.js'

/*
 * The source pane shows the template that produced the variant, so a handler
 * has to appear as its author wrote it. The pass this replaces escaped `'` for
 * a JavaScript string and rewrote `"` into `'` — neither of which is the
 * attribute the result lands in — and each half reached the reader alone (#602).
 *
 * A case carrying both quote characters is the one that matters: each half
 * fails on its own, so a fixture with only one of them passes a half-fix.
 */
describe('delimitAttr', () => {
  it('leaves code with no quotes in it alone, under the usual delimiter', () => {
    expect(delimitAttr(['onClick'])).toEqual({ quote: '"', lines: ['onClick'] })
  })

  // Was shown as `() => alert('hi')` — the reader's double quotes rewritten.
  it('takes the other delimiter rather than rewriting a double quote', () => {
    expect(delimitAttr(['() => alert("hi")'])).toEqual({
      quote: '\'',
      lines: ['() => alert("hi")'],
    })
  })

  // Was shown as `() => alert(\'hi\')`, backslashes and all.
  it('leaves a single quote unescaped, since the attribute is not a JS string', () => {
    expect(delimitAttr(['() => alert(\'hi\')'])).toEqual({
      quote: '"',
      lines: ['() => alert(\'hi\')'],
    })
  })

  // Both characters, so whichever delimiter is chosen has to be escaped inside
  // it. Two doubles against one single here, so the single is the cheaper one.
  it('escapes the quote that appears less often when the code carries both', () => {
    expect(delimitAttr(['() => console.log("it\'s here")'])).toEqual({
      quote: '\'',
      lines: ['() => console.log("it&#39;s here")'],
    })
  })

  // Four singles against two doubles, so the double is the cheaper one here.
  it('escapes the double quote instead when that is the rarer one', () => {
    expect(delimitAttr(['() => alert(\'a\', \'b\', "c")'])).toEqual({
      quote: '"',
      lines: ['() => alert(\'a\', \'b\', &quot;c&quot;)'],
    })
  })

  // The alert CodeQL raised: the escaping pass never escaped a backslash, so
  // `() => alert('it\'s')` went in carrying one and came out carrying four.
  it('passes a backslash through untouched', () => {
    const written = '() => alert(\'it\\\'s\')'

    expect(delimitAttr([written]).lines[0]).toBe(written)
  })

  it('reads the whole value when deciding, not one line of it', () => {
    expect(delimitAttr(['() => {', '  alert("hi")', '}']).quote).toBe('\'')
  })

  it('escapes on every line, not only the one that decided it', () => {
    expect(delimitAttr(['() => {', '  alert("a")', '  alert(\'b\')', '  alert(\'c\')', '}']).lines).toEqual([
      '() => {',
      '  alert(&quot;a&quot;)',
      '  alert(\'b\')',
      '  alert(\'c\')',
      '}',
    ])
  })
})

/*
 * `delimitAttr` could be right and unused, so these drive the generator itself.
 *
 * The handler states its own source rather than being written as one. A `.vue`
 * ships to the browser untransformed, but this spec does not: esbuild rewrote
 * `alert('it\'s')` in the fixture to `alert("it's")` before `toString()` ever
 * saw it, so a handler written here is not the text the generator receives.
 * Overriding `toString` is what makes the input exact.
 */
const WITH_DOUBLE = '() => alert("hi")'
const WITH_SINGLE = '() => alert(\'hi\')'
const WITH_BOTH = '() => console.log("it\'s here")'
const WITH_BACKSLASH = String.raw`() => alert('it\'s')`

function handlerWritten(source: string): () => void {
  const handler = (): void => {}
  handler.toString = () => source
  return handler
}

function variantWith(source: string): Variant {
  return {
    state: {},
    slots: () => ({ default: () => h('button', { onClick: handlerWritten(source) }, 'go') }),
  } as unknown as Variant
}

describe('generateSourceCode, for an event handler', () => {
  it('shows a double quote the author wrote, under the other delimiter', async () => {
    expect(await generateSourceCode(variantWith(WITH_DOUBLE))).toContain(`@click='${WITH_DOUBLE}'`)
  })

  it('shows a single quote unescaped, under the usual delimiter', async () => {
    expect(await generateSourceCode(variantWith(WITH_SINGLE))).toContain(`@click="${WITH_SINGLE}"`)
  })

  it('escapes only the rarer quote when the handler carries both', async () => {
    expect(await generateSourceCode(variantWith(WITH_BOTH)))
      .toContain('@click=\'() => console.log("it&#39;s here")\'')
  })

  it('shows a backslash the author wrote exactly as written', async () => {
    expect(await generateSourceCode(variantWith(WITH_BACKSLASH))).toContain(WITH_BACKSLASH)
  })

  // The alert itself: one backslash in, four out.
  it('does not multiply the backslash it was given', async () => {
    const source = await generateSourceCode(variantWith(WITH_BACKSLASH))

    expect(source.match(/\\/g)).toHaveLength(1)
  })
})
