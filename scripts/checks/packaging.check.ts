/**
 * @module-tag release
 * @module-tag build
 */
import { expect, it } from 'vitest'
import { checkPublishable } from '../check-publishable.ts'

it('every publishable package packs and resolves, without asking the registry', () => {
  expect(checkPublishable(undefined, { offline: true }), 'Fix these before tagging: a tag cannot be moved once the GitHub release and half the registry refer to it.').toEqual([])
})
