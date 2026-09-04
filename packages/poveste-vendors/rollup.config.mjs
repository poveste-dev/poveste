import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import { execaSync } from 'execa'
import fs from 'fs-extra'
import { globbySync } from 'globby'
import { defineConfig } from 'rollup'
import ts from 'rollup-plugin-typescript2'
import { entries } from './entries.js'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  input: entries,

  plugins: [
    resolve({ preferBuiltins: true }),
    commonjs(),
    ts({
      check: false,
      // Spelled out rather than left to the plugin's default `*.ts+(|x)`, which
      // is an extglob with an empty alternative and stopped being parsed as one
      // in picomatch 2.3.2 — it compiles to a literal `\.ts\+\(\|x\)`, matches
      // no file, and the plugin emits no declarations at all (#560, #572).
      include: ['*.ts', '**/*.ts', '*.tsx', '**/*.tsx', '**/*.cts', '**/*.mts'],
      tsconfigOverride: {
        compilerOptions: {
          rootDir: 'src/client',
        },
      },
    }),
    {
      name: 'define',
      transform(code) {
        return code.replace(/__VUE_OPTIONS_API__/g, 'true')
      },
    },
    {
      name: 'process-build',
      closeBundle() {
        try {
          const pkg = fs.readJsonSync('./package.json')
          const tempDir = path.resolve('./node_modules/.temp/poveste-vendors')
          fs.ensureDirSync(tempDir)
          fs.emptyDirSync(tempDir)
          const targetDtsDir = path.resolve('./dist/client/node_modules')
          fs.ensureDirSync(targetDtsDir)
          fs.emptyDirSync(targetDtsDir)
          const tempPkg = {
            name: 'poveste-vendors-temp',
            version: '0.0.0',
            dependencies: {},
          }
          const pkgExports = {}
          const files = globbySync('./dist/client/*.d.ts', { cwd: __dirname })

          // The export map below is written into this package's own checked-in
          // package.json, and an empty glob writes an empty one — no error, a
          // dirty tree, and every named subpath silently stops resolving for
          // every downstream package. It happened: `globby` resolves through
          // `picomatch`, and 2.3.2 stopped matching this pattern (#560).
          //
          // `entries` is what rollup just built, so it is the honest expectation.
          const expected = entries.map(entry => path.basename(entry, '.ts'))
          const built = files.map(file => path.basename(file, '.d.ts'))
          const missing = expected.filter(name => !built.includes(name))
          if (missing.length > 0) {
            throw new Error(
              `dist/client is missing ${missing.length} of ${expected.length} shim declarations: ${missing.join(', ')}.\n`
              + `Found ${built.length} (${built.join(', ') || 'none'}) from ${files.length} matched files.\n`
              + 'Writing package.json exports from this would drop those subpaths and break every import of them.',
            )
          }

          for (const file of files) {
            // Retrieve imports from dts
            {
              let content = fs.readFileSync(file, 'utf-8')
              content = content.replace(/from '(.*)'/g, (match, p1) => {
                const data = fs.readJsonSync(require.resolve(`./node_modules/${p1}/package.json`))
                const versionSelector = data.version
                tempPkg.dependencies[p1] = versionSelector
                return `from './node_modules/${p1}'`
              })
              fs.writeFileSync(file, content, 'utf-8')
            }
            // Create entry files in root
            {
              const filepath = file.replace(/\.d\.ts$/, '')
              const content = `import Default from '${filepath}'

export default Default
export * from '${filepath}'\n`.replace(/\n/g, process.platform === 'win32' ? '\r\n' : '\n')
              fs.writeFileSync(path.basename(file).replace(/^b-/, ''), content, 'utf-8')
            }
            // Exports (package.json)
            const importName = path.basename(file).replace(/\.d\.ts$/, '').replace(/^b-/, '')
            pkgExports[`./${importName}`] = file.replace(/\.d\.ts$/, '.js')
          }
          // Install dependencies in temp module
          {
            const tempPkgFile = path.resolve(tempDir, 'package.json')
            fs.writeJsonSync(tempPkgFile, tempPkg)
            execaSync('npm', ['install', '--prefer-offline --legacy-peer-deps'], { cwd: tempDir })
            const dtsFiles = globbySync(['**/*.d.{ts,mts}', '**/package.json'], {
              cwd: path.join(tempDir, 'node_modules'),
              dot: true,
            })
            for (const dtsFile of dtsFiles) {
              const absoluteDtsFile = path.resolve(tempDir, 'node_modules', dtsFile)
              fs.copySync(absoluteDtsFile, path.resolve(targetDtsDir, dtsFile))
            }
          }
          // Update exports field in package.json
          pkgExports['./*'] = './*'
          pkg.exports = pkgExports
          fs.writeJsonSync('./package.json', pkg, { spaces: 2 })
        }
        catch (e) {
          // Rethrow: this step rewrites a checked-in manifest, so a swallowed
          // failure leaves the tree half-written and the build reporting success.
          console.error(e)
          throw e
        }
      },
    },
  ],

  output: {
    format: 'es',
    exports: 'auto',
    entryFileNames: '[name].js',
    chunkFileNames: '[name].js',
    assetFileNames: '[name][extname]',
    hoistTransitiveImports: false,
    dir: 'dist/client',
  },

  external: [],

  treeshake: false,
  preserveEntrySignatures: 'strict',
})
