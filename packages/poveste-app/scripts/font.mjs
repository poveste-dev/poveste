import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const FONT_PACKAGE = '@fontsource/noto-sans-display'

export const HEADER = `/*
 * Upstream's sheet with the woff fallback dropped — every browser the app
 * runs in takes the woff2, so shipping both put ~160K of never-fetched files
 * in each book. Copied rather than imported because the package pairs the two
 * formats in every \`src\`; \`font.spec.ts\` fails if a bump moves the subsets.
 *
 * Regenerate: node packages/poveste-app/scripts/font.mjs
 */
`

/**
 * Upstream's sheet, keeping the woff2 of each pair and addressing it by package
 * specifier so the sheet resolves from outside the package.
 */
export function generateFontCss(upstream) {
  return `${HEADER}\n${upstream.replace(
    /url\(\.\/files\/([^)]+)\.woff2\) format\('woff2'\), url\([^)]+\) format\('woff'\)/g,
    `url('${FONT_PACKAGE}/files/$1.woff2') format('woff2')`,
  )}`
}

// `import.meta` is rewritten by the app's build plugin, so the CLI entry leans
// on argv instead.
if (process.argv[1]?.endsWith('font.mjs')) {
  const here = dirname(process.argv[1])
  const upstream = readFileSync(join(here, '../node_modules', FONT_PACKAGE, 'index.css'), 'utf8')
  const target = join(here, '../src/app/style/font.css')

  writeFileSync(target, generateFontCss(upstream))
  console.log(`Wrote ${generateFontCss(upstream).split('@font-face').length - 1} faces to ${target}`)
}
