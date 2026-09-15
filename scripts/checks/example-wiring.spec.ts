import { expect, it } from 'vitest'
import { checkExampleWiring } from '../check-example-wiring.ts'

it('the workflow matrix, the Playwright config, the ports and the guide name the same books', { tags: ['examples', 'ci'] }, async () => {
  expect(await checkExampleWiring(), 'The matrix, playwright.config.ts and each example\'s own package.json all name the same books and the same ports. Fix whichever one drifted.').toEqual([])
})
