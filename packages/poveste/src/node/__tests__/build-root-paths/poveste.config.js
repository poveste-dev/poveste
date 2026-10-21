import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getInjectedImport } from 'poveste'

const here = fileURLToPath(new URL('.', import.meta.url))

// Each way a path on the building machine reached a built book (#1383): a logo
// and a plugin module in the serialised config, a plugin story added by
// absolute path with an injected import, and a markdown story's virtual module.
export default {
  storyMatch: ['**/*.story.js'],
  theme: { logo: { square: './logo.svg', light: './logo.svg', dark: './logo.svg' } },
  plugins: [{
    name: 'root-paths',
    docgen: { match: () => false, module: join(here, 'no-extractor.mjs') },
    onBuild(api) {
      mkdirSync(api.pluginTempDir, { recursive: true })
      const file = join(api.pluginTempDir, 'Plugin.story.js')
      writeFileSync(file, `import { ref } from ${getInjectedImport('@poveste/vendors/vue')}

export default {
  id: 'plugin-story',
  title: 'Plugin story',
  variants: [{ title: 'Default', onMount: () => ref(0) }],
}
`)
      api.addStoryFile(file)
    },
  }],
}
