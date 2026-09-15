import { expect, it } from 'vitest'
import { checkConformanceConfig } from '../check-conformance-config.ts'

it('every conformance book declares the background presets the shared specs assert', { tags: ['examples'] }, async () => {
  expect(await checkConformanceConfig(), 'A conformance book declares the background presets as well as carrying the stories. See "The conformance contract" in ai/AGENTS.md.').toEqual([])
})
