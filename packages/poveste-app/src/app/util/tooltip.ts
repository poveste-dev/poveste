import { isMac } from './env.js'
import { formatKey } from './keyboard.js'

export function makeTooltip(descriptionHtml: string, keyboardShortcut: (options: { isMac: boolean }) => string) {
  return {
    content: `<div>${descriptionHtml}</div><div class="flex items-center gap-1 mt-2 text-sm">${genKeyboardShortcutHtml(keyboardShortcut({ isMac }))}</div>`,
    html: true,
  }
}

function genKeyboardShortcutHtml(shortcut: string) {
  return `<span class="border border-gray-600 px-1 rounded-sm text-gray-400">${shortcut.split('+').map(k => formatKey(k.trim())).join(' ')}</span>`
}
