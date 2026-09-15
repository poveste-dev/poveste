import { expect, it } from 'vitest'
import { checkPublishable } from '../check-publishable.ts'

it('every publishable package exists on the registry, packs and resolves', () => {
  expect(checkPublishable(), 'Fix these before tagging: a tag cannot be moved once the GitHub release and half the registry refer to it.').toEqual([])
})
