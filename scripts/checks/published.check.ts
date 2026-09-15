import { expect, it } from 'vitest'
import { checkPublished } from '../check-published.ts'

it('every package is on the registry at its released version', () => {
  expect(checkPublished(), 'Re-run this release job. Do NOT `npm publish` by hand: it does not rewrite pnpm\'s `workspace:` protocol, which is what turned 0.6.0 into 0.6.1 with three uninstallable packages.').toEqual([])
})
