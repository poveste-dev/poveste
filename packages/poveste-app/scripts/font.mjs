import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const FONT_PACKAGE = '@fontsource/noto-sans-display'

export const HEADER = `/*
 * Upstream's sheet with the woff fallback dropped — every browser the app
 * runs in takes the woff2, so shipping both put ~160K of never-fetched files
 * in each book. Copied rather than imported because the package pairs the two
 * formats in every \`src\`; \`font.spec.ts\` fails if a bump moves the subsets.
 *
 * Vendored rather than resolved from the package, which publishes the family
 * whole: 5.9 MB installed to ship 108 KB (#306). OFL-1.1, so \`fonts/LICENSE\`
 * travels with the files.
 *
 * Regenerate: node packages/poveste-app/scripts/font.mjs
 */
`

/** Upstream's sheet, keeping the woff2 of each pair and pointing at the copies vendored beside it. */
export function generateFontCss(upstream) {
  return `${HEADER}\n${upstream.replace(
    /url\(\.\/files\/([^)]+)\.woff2\) format\('woff2'\), url\([^)]+\) format\('woff'\)/g,
    `url('./fonts/$1.woff2') format('woff2')`,
  )}`
}

/** The files the generated sheet asks for, as bare names. */
export function referencedFiles(css) {
  return [...css.matchAll(/url\('\.\/fonts\/([^']+)'\)/g)].map(match => match[1])
}

// `import.meta` is rewritten by the app's build plugin, so the CLI entry leans
// on argv instead.
if (process.argv[1]?.endsWith('font.mjs')) {
  const here = dirname(process.argv[1])
  const upstream = readFileSync(join(here, '../node_modules', FONT_PACKAGE, 'index.css'), 'utf8')
  const target = join(here, '../src/app/style/font.css')

  const css = generateFontCss(upstream)
  writeFileSync(target, css)

  // The sheet and the files it names are one artifact; regenerating one without
  // the other leaves a book asking for a face that is not there.
  const fonts = join(here, '../src/app/style/fonts')
  mkdirSync(fonts, { recursive: true })
  const files = referencedFiles(css)
  for (const file of files) {
    copyFileSync(join(here, '../node_modules', FONT_PACKAGE, 'files', file), join(fonts, file))
  }
  copyFileSync(join(here, '../node_modules', FONT_PACKAGE, 'LICENSE'), join(fonts, 'LICENSE'))

  console.log(`Wrote ${css.split('@font-face').length - 1} faces to ${target} and ${files.length} files to ${fonts}`)
}
