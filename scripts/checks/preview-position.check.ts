import { expect, it } from 'vitest'
import { checkPreviewPosition } from '../check-preview-position.ts'

it('no layout choice moves the preview in the component tree', { tags: ['app'] }, () => {
  expect(checkPreviewPosition(), 'Moving the preview rebuilds it and cold-boots the sandbox under it (#328, #595, #596, #600). Hoist it above the branches, or add the condition to STABLE in scripts/check-preview-position.ts with the reason.').toEqual([])
})
