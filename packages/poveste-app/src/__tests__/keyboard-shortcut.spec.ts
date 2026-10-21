// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { onKeyboardShortcut } from '../app/util/keyboard'

/** What Playwright's `keyboard.press('Control+Shift+D')` dispatches, in order. */
function pressControlShiftD() {
  const modifiers = { ctrlKey: true, shiftKey: true }
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }))
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', ...modifiers }))
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', ...modifiers }))
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'D', ...modifiers }))
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', ctrlKey: true }))
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }))
}

describe('a keyboard shortcut', () => {
  // A released key leaves the pressed set only on the next animation frame. A
  // second press inside that frame matched on its Shift keydown, then again on its
  // D, and the dark-mode toggle went light and back to dark (#1346).
  it('fires once for each press, even when the next press starts before a frame has passed', () => {
    const handler = vi.fn()
    const scope = effectScope()
    scope.run(() => onKeyboardShortcut(['ctrl+shift+d'], handler))

    pressControlShiftD()
    pressControlShiftD()

    expect(handler).toHaveBeenCalledTimes(2)
    scope.stop()
  })
})
