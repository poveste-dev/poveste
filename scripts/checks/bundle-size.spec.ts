import process from 'node:process'
import { expect, it } from 'vitest'
import { checkBundleSize } from '../check-bundle-size.ts'

it('the built vue3 book is within every size ceiling', { tags: ['app', 'build'] }, async ({ annotate }) => {
  const { problems, measurements } = checkBundleSize()
  process.stdout.write(measurements.map(line => `  ${line}\n`).join(''))
  if (measurements.length) {
    await annotate(measurements.join('\n'), 'notice')
  }
  expect(problems, 'Raise a ceiling only with a reason written next to it. See scripts/check-bundle-size.ts.').toEqual([])
})
