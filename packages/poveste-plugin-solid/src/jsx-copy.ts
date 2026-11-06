import { readFile } from 'node:fs/promises'
import { transformWithOxc } from 'vite'

/**
 * The story file again, with its JSX building plain elements rather than DOM. Solid
 * compiles JSX to DOM operations and keeps no tree to read back, so this is the tree:
 * `render` from this copy returns what `render` from the real one was given, with each
 * value worked out from the state it's passed.
 *
 * In `load`, so `vite-plugin-solid` gets it with no JSX left to compile.
 */
export async function compileJsxCopy(file: string): Promise<string> {
  const { code } = await transformWithOxc(await readFile(file, 'utf8'), file, {
    lang: 'tsx',
    jsx: { runtime: 'classic', pragma: '__povesteJsx', pragmaFrag: '__povesteFragment', throwIfNamespace: false },
  })
  return `const __povesteElement = Symbol.for('poveste.solid.element')
const __povesteFragment = Symbol.for('poveste.solid.fragment')
const __povesteJsx = (type, props, ...children) => ({
  [__povesteElement]: true,
  type,
  props: children.length ? { ...props, children: children.length === 1 ? children[0] : children } : { ...props },
})
${code}`
}
