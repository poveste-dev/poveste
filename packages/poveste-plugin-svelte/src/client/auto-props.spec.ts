import { describe, expect, it } from 'vitest'
import { variantToDrive } from './auto-props'

const story = (...ids: string[]) => ({ variants: ids.map(id => ({ id })) })

describe('the variant a realm drives auto-props for', () => {
  it('is the one it renders', () => {
    expect(variantToDrive(story('a', 'b'), { id: 'b' })).toBe(1)
  })

  it('is none when the variant turned auto-props off', () => {
    expect(variantToDrive(story('a'), { id: 'a', autoPropsDisabled: true })).toBe(-1)
  })

  // Story props reach only an implicit variant (#466), so the story-level option
  // is read off the story rather than waiting to be inherited.
  it('is none when the story turned auto-props off, even with explicit variants', () => {
    expect(variantToDrive({ ...story('a', 'b'), autoPropsDisabled: true }, { id: 'b' })).toBe(-1)
  })

  // The mount realm registers configuration for every variant and renders none.
  it('is none in a realm that renders no variant', () => {
    expect(variantToDrive(story('a'), undefined)).toBe(-1)
  })

  it('is none during collection, which has no story to read', () => {
    expect(variantToDrive(undefined, { id: 'a' })).toBe(-1)
  })

  it('is none for a variant the story does not list', () => {
    expect(variantToDrive(story('a'), { id: 'gone' })).toBe(-1)
  })
})
