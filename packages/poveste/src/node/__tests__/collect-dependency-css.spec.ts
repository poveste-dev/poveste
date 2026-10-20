import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const FIXTURE = path.resolve(__dirname, './collect-dependency-css')
const BIN = path.resolve(__dirname, '../../../bin.mjs')
const LIB = path.join(FIXTURE, 'node_modules', 'css-lib')

// A `type: module` package whose own chunk imports its stylesheet, the shape of
// @primer/react 38's `dist`. Collection hands its `.js` to Node, which had no
// format for the `.css` (#1392).
function installCssLib() {
  mkdirSync(path.join(LIB, 'dist'), { recursive: true })
  writeFileSync(path.join(LIB, 'package.json'), JSON.stringify({ name: 'css-lib', version: '1.0.0', type: 'module', exports: { '.': './dist/index.js' } }))
  writeFileSync(path.join(LIB, 'dist', 'index.js'), `export { label } from './label.js'\n`)
  writeFileSync(path.join(LIB, 'dist', 'label.js'), `import './label.css'\nexport const label = 'From css-lib'\n`)
  writeFileSync(path.join(LIB, 'dist', 'label.css'), '.css-lib-label { color: rgb(1, 2, 3); }\n')
}

describe('a story importing a library whose JavaScript imports its own CSS', () => {
  it('is collected, and the library\'s CSS still reaches the story\'s stylesheet', () => {
    installCssLib()
    const outDir = path.join(FIXTURE, '.poveste', 'dist')
    try {
      const result = spawnSync(process.execPath, [BIN, 'build'], { cwd: FIXTURE, encoding: 'utf8', timeout: 120_000 })

      expect(result.stdout + result.stderr).not.toContain('ERR_UNKNOWN_FILE_EXTENSION')
      expect(result.status, result.stderr).toBe(0)
      expect(readFileSync(path.join(outDir, 'poveste.json'), 'utf8')).toContain('From css-lib')
      expect(readFileSync(path.join(outDir, 'bundle-sandbox.css'), 'utf8')).toContain('.css-lib-label')
    }
    finally {
      rmSync(path.join(FIXTURE, '.poveste'), { recursive: true, force: true })
      rmSync(path.join(FIXTURE, 'node_modules'), { recursive: true, force: true })
    }
  }, 180_000)
})
