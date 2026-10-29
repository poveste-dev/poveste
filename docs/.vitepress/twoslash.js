// What a fence marked `twoslash` compiles against (#1526). The docs deploy builds no
// package, so each published entry is read from its source rather than its `dist`,
// and each library a guide imports from the copy the workspace package using it has.
const { existsSync, readdirSync, readFileSync, realpathSync } = require('node:fs')
const { join } = require('node:path')

const ROOT = join(__dirname, '../..')
const PACKAGES = join(ROOT, 'packages')

/** `./dist/node/index.d.ts` → `src/node/index.ts`, if that file exists. */
function sourceOf(dir, target) {
  const base = target.replace(/^\.\/dist\//, 'src/').replace(/(\.d)?\.[cm]?[jt]s$/, '')
  return [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].map(file => join(dir, file)).find(file => existsSync(file))
}

function workspacePaths() {
  const paths = {}
  for (const name of readdirSync(PACKAGES)) {
    const dir = join(PACKAGES, name)
    const manifest = join(dir, 'package.json')
    if (!existsSync(manifest)) {
      continue
    }
    const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
    if (pkg.private) {
      continue
    }
    for (const [subpath, value] of Object.entries(pkg.exports ?? {})) {
      const target = typeof value === 'string' ? value : value.types ?? value.default
      const source = subpath.includes('*') || !target ? undefined : sourceOf(dir, target)
      if (source) {
        paths[subpath === '.' ? pkg.name : `${pkg.name}/${subpath.slice(2)}`] = [source]
      }
    }
    // A subpath the manifest leaves to `./*`, such as `@poveste/plugin-quasar/setup`.
    paths[`${pkg.name}/*`] = [join(dir, 'src/*')]
  }
  return paths
}

// Each library a guide's example imports, and a workspace package that installs it.
const LIBRARIES = {
  'vite': 'packages/poveste',
  'react': 'packages/poveste-plugin-react',
  '@types/react': 'packages/poveste-plugin-react',
  'solid-js': 'packages/poveste-plugin-solid',
  'vite-plugin-solid': 'packages/poveste-plugin-solid',
  '@vitejs/plugin-react': 'packages/poveste-plugin-react',
  '@vitejs/plugin-vue': 'packages/poveste-plugin-vue',
  'vue': 'packages/poveste-plugin-vue',
  'vue-i18n': 'examples/vue',
  'svelte': 'packages/poveste-plugin-svelte',
  '@sveltejs/vite-plugin-svelte': 'packages/poveste-plugin-svelte',
  '@sveltejs/kit': 'examples/sveltekit',
}

/** The file a package's manifest names for its types, through `exports` first. */
function typesOf(dir) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  let entry = pkg.exports?.['.'] ?? pkg.exports
  while (entry && typeof entry === 'object' && !entry.types) {
    entry = entry.import ?? entry.default ?? entry.require
  }
  let types = (typeof entry === 'object' ? entry?.types : undefined) ?? pkg.types ?? pkg.typings
  // A conditional `types`, `{ import, require }`.
  while (types && typeof types === 'object') {
    types = types.import ?? types.default ?? types.require
  }
  // An entry with no `types` has its declarations beside it, as TypeScript itself looks.
  const beside = typeof entry === 'string' ? [entry.replace(/\.js$/, '.d.ts'), entry.replace(/\.mjs$/, '.d.mts')].find(file => file !== entry && existsSync(join(dir, file))) : undefined
  return types ?? beside ? join(dir, types ?? beside) : dir
}

function libraryPaths() {
  const paths = {}
  for (const [name, from] of Object.entries(LIBRARIES)) {
    // Through the using package's own `node_modules`: some manifests keep `package.json` out of `exports`.
    const link = join(ROOT, from, 'node_modules', name)
    if (!existsSync(link)) {
      continue
    }
    const dir = realpathSync(link)
    // `@types/react` is where `react` reads its types from.
    const specifier = name === '@types/react' ? 'react' : name
    paths[specifier] = [typesOf(dir)]
    paths[`${specifier}/*`] = [`${dir}/*`]
  }
  return paths
}

module.exports = {
  compilerOptions: {
    // `react-jsx`; a Solid page's fences say `// @jsxImportSource: solid-js` for themselves.
    jsx: 4,
    paths: { ...libraryPaths(), ...workspacePaths() },
  },
}
