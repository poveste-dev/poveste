import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { isAbsolute, join } from 'pathe'

/**
 * Where a SvelteKit project keeps its static assets, or undefined when this is
 * not one.
 *
 * `vite-plugin-sveltekit-compile` is what sets Vite's `publicDir` to
 * `kit.files.assets`, and poveste drops that plugin through `viteIgnorePlugins`
 * — so a book served none of a Kit project's `static/`, in dev or in the build
 * (#463). This restores the one value that went with it.
 */
export async function svelteKitAssetsDir(cwd: string): Promise<string | undefined> {
  if (!declaresKit(cwd)) {
    return undefined
  }
  const assets = await configuredAssetsDir(cwd) ?? 'static'
  return isAbsolute(assets) ? assets : join(cwd, assets)
}

// The project's own manifest, not `require.resolve`: resolution walks up out of
// the project and finds Kit through a sibling in a workspace store, which
// reported a plain Svelte book as SvelteKit and pointed its `publicDir` at a
// `static/` that does not exist — losing the `public/` it actually had.
function declaresKit(cwd: string): boolean {
  try {
    const manifest = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
    return ['dependencies', 'devDependencies', 'peerDependencies']
      .some(field => manifest[field]?.['@sveltejs/kit'])
  }
  catch {
    return false
  }
}

// Kit reads this from `svelte.config.js` and defaults it to `static`. Reading it
// rather than assuming the default is what makes a project that moved its assets
// work; a config that will not load is not this plugin's failure to report, so
// the default stands in.
async function configuredAssetsDir(cwd: string): Promise<string | undefined> {
  const configPath = join(cwd, 'svelte.config.js')
  if (!existsSync(configPath)) {
    return undefined
  }
  try {
    const loaded = await import(pathToFileURL(configPath).href)
    const assets = loaded.default?.kit?.files?.assets
    return typeof assets === 'string' ? assets : undefined
  }
  catch {
    return undefined
  }
}
