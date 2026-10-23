import { describe, expect, it } from 'vitest'
import { readGeneric } from '../generic.js'

// A table printing `T | T[]` says nothing of what `T` may be; the attribute does (#1436).
describe('a component\'s type parameters', () => {
  it('are read from the setup script\'s generic attribute, constraint and default included', () => {
    expect(readGeneric('<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">\n</script>')).toBe('T extends AcceptableValue = AcceptableValue')
  })

  it('keep a `>` inside the attribute, which would end a tag read naively', () => {
    expect(readGeneric('<script setup lang="ts" generic="T extends Record<string, unknown>, M extends boolean = false">\n</script>')).toBe('T extends Record<string, unknown>, M extends boolean = false')
  })

  it('are written on one line when the source spreads them over several', () => {
    expect(readGeneric('<script\n  setup\n  lang="ts"\n  generic="\n    T,\n    U extends T = T\n  "\n>\n</script>')).toBe('T, U extends T = T')
  })

  it('are read from single quotes, past a plain script block', () => {
    expect(readGeneric('<script lang="ts">export const x = 1</script>\n<script setup lang=\'ts\' generic=\'T\'>\n</script>')).toBe('T')
  })

  it('are none for a component that declares none', () => {
    expect(readGeneric('<script setup lang="ts">\n</script>')).toBeUndefined()
    expect(readGeneric('<template><div /></template>')).toBeUndefined()
  })
})
