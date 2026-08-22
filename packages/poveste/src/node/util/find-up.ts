import fs from 'node:fs'
import path from 'pathe'

/**
 * The first of `fileNames` that exists, searching `cwd` and then upwards.
 *
 * `accept` narrows that to the first one that is also the file the caller
 * wanted: several of these names are ordinary — `src/app.css`, `style.css` —
 * so existence alone says very little, and a near-miss in the same directory
 * would otherwise shadow the real match sitting behind it in the list.
 */
export function findUp(cwd: string = process.cwd(), fileNames: string[], accept?: (filePath: string) => boolean): string {
  let { root } = path.parse(cwd)
  let dir = cwd

  // On Windows, it will for example return `C:`, we need to add the trailing `/`
  if (root[1] === ':' && root[2] === undefined) {
    root += '/'
  }

  while (dir !== root) {
    for (const fileName of fileNames) {
      const searchPath = path.join(dir, fileName)
      if (fs.existsSync(searchPath) && (!accept || accept(searchPath))) {
        return searchPath
      }
    }
    dir = path.dirname(dir)
  }

  return null
}
