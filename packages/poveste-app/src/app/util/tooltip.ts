import { isMac } from './env.js'
import { formatKey } from './keyboard.js'

export function makeTooltip(descriptionHtml: string, keyboardShortcut: (options: { isMac: boolean }) => string) {
  return {
    content: `<div>${descriptionHtml}</div><div class="ptw-flex ptw-items-center ptw-gap-1 ptw-mt-2 ptw-text-sm">${genKeyboardShortcutHtml(keyboardShortcut({ isMac }))}</div>`,
    html: true,
  }
}

function genKeyboardShortcutHtml(shortcut: string) {
  return `<span class="ptw-border ptw-border-gray-600 ptw-px-1 ptw-rounded-sm ptw-text-gray-400">${shortcut.split('+').map(k => formatKey(k.trim())).join(' ')}</span>`
}
