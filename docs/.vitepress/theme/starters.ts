import type { OpenFileOption, ProjectFiles } from '@stackblitz/sdk'

// The "Try it live" starters, as data. Kept apart from the StackBlitz launcher
// so `scripts/checks/starters.ts` can resolve these manifests against the real
// npm registry without pulling in the browser SDK — see #113.
//
// StackBlitz WebContainer projects always boot with npm (the SDK has no
// package-manager control), so the starters are plain npm — no packageManager
// field, to avoid a misleading claim or a corepack conflict.
//
// That npm boot is why the versions below cannot be copied from `examples/*`.
// This workspace sets `peerDependencyRules.allowedVersions.vite: ^8.0.0` in
// pnpm-workspace.yaml, so an example can depend on a plugin whose declared peer
// range stops at Vite 7 and still install. npm has no such override and fails
// the install outright with ERESOLVE. Every version here is therefore picked
// from the package's *declared* peer range, not from what the examples pin.
// `latest` over a pinned minor, decided in #113: pinning strands people on an
// old poveste, and `pnpm test:starters` now makes the other failure mode loud.
const POVESTE = 'latest'

// poveste >=0.3 peers `vite: ^8.0.0`; the catalog and `@nuxt/vite-builder` both
// land on ^8.2.0.
const VITE = '^8.2.0'

// Unnumbered on purpose: `svelte3` outlived Svelte 3 by two majors before
// anyone noticed. A bare framework name never goes stale — see #120.
export type Framework = 'vue' | 'svelte' | 'sveltekit' | 'nuxt' | 'solid' | 'react' | 'quasar'

export interface Manifest {
  name: string
  private: true
  type: 'module'
  scripts: Record<string, string>
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

export interface Starter {
  manifest: Manifest
  files: ProjectFiles
  openFile: OpenFileOption
}

function manifest(name: string, extraDev: Record<string, string>, deps: Record<string, string> = {}): Manifest {
  return {
    name,
    private: true,
    type: 'module',
    scripts: {
      dev: 'poveste dev',
      build: 'poveste build',
      preview: 'poveste preview',
    },
    dependencies: deps,
    devDependencies: {
      poveste: POVESTE,
      ...extraDev,
    },
  }
}

/** The starter's files as StackBlitz wants them, with the manifest serialised back in. */
export function projectFiles(starter: Starter): ProjectFiles {
  return {
    ...starter.files,
    'package.json': `${JSON.stringify(starter.manifest, null, 2)}\n`,
  }
}

function vueStarter(): Starter {
  return {
    openFile: 'src/MyButton.story.vue',
    manifest: manifest(
      'poveste-vue-starter',
      {
        '@poveste/plugin-vue': POVESTE,
        // v6 peers `^5 || ^6 || ^7 || ^8`, so it already spans Vite 8.
        '@vitejs/plugin-vue': '^6.0.0',
        'vite': VITE,
      },
      { vue: '^3.5.26' },
    ),
    files: {
      'vite.config.ts': `import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
})
`,
      'poveste.config.ts': `import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue()],
})
`,
      'src/MyButton.vue': `<script setup>
defineProps({
  label: { type: String, default: 'Click me' },
})
</script>

<template>
  <button class="my-button">{{ label }}</button>
</template>

<style scoped>
.my-button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #24c56a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
</style>
`,
      'src/MyButton.story.vue': `<script setup>
import MyButton from './MyButton.vue'
</script>

<template>
  <Story title="MyButton">
    <Variant title="default">
      <MyButton />
    </Variant>
    <Variant title="custom label">
      <MyButton label="Hello Poveste" />
    </Variant>
  </Story>
</template>
`,
    },
  }
}

function svelteStarter(): Starter {
  return {
    openFile: 'src/MyButton.story.svelte',
    manifest: manifest('poveste-svelte-starter', {
      '@poveste/plugin-svelte': POVESTE,
      // v6 stops at `vite ^6.3 || ^7`; v7 is the first release to peer Vite 8,
      // and it in turn requires `svelte ^5.46.4`.
      '@sveltejs/vite-plugin-svelte': '^7.0.0',
      'svelte': '^5.46.4',
      'vite': VITE,
    }),
    files: {
      'vite.config.ts': `/// <reference types="poveste" />
import { HstSvelte } from '@poveste/plugin-svelte'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [svelte()],
  poveste: {
    plugins: [HstSvelte()],
  },
})
`,
      'src/MyButton.svelte': `<script>
  const { label = 'Click me' } = $props()
</script>

<button class="my-button">{label}</button>

<style>
  .my-button {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    background: #24c56a;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
  }
</style>
`,
      'src/MyButton.story.svelte': `<script>
  import MyButton from './MyButton.svelte'

  const { Hst } = $props()
</script>

<Hst.Story title="MyButton">
  <Hst.Variant title="default">
    <MyButton />
  </Hst.Variant>
  <Hst.Variant title="custom label">
    <MyButton label="Hello Poveste" />
  </Hst.Variant>
</Hst.Story>
`,
    },
  }
}

function svelteKitStarter(): Starter {
  return {
    openFile: 'src/lib/MyButton.story.svelte',
    manifest: manifest('poveste-sveltekit-starter', {
      '@poveste/plugin-svelte': POVESTE,
      // The floor `@poveste/plugin-svelte` declares as its optional Kit peer.
      // 2.53.0 is the first Kit to peer Vite 8 and vite-plugin-svelte v7.
      '@sveltejs/kit': '^2.53.0',
      '@sveltejs/vite-plugin-svelte': '^7.0.0',
      'svelte': '^5.46.4',
      'vite': VITE,
    }),
    files: {
      // No adapter. One is only needed by `vite build`, which this project
      // never runs — its scripts are poveste only — and `adapter-auto` would
      // pull provider detection into a WebContainer for nothing.
      'svelte.config.js': `export default {}
`,
      'vite.config.ts': `/// <reference types="poveste" />
import { HstSvelte } from '@poveste/plugin-svelte'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [sveltekit()],
  poveste: {
    plugins: [HstSvelte()],
  },
})
`,
      'src/app.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    %sveltekit.head%
  </head>
  <body>
    <div>%sveltekit.body%</div>
  </body>
</html>
`,
      'src/routes/+page.svelte': `<script>
  import MyButton from '$lib/MyButton.svelte'
</script>

<h1>SvelteKit + Poveste</h1>
<MyButton label="Hello" />
`,
      'src/lib/MyButton.svelte': `<script>
  const { label = 'Click me' } = $props()
</script>

<button class="my-button">{label}</button>

<style>
  .my-button {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    background: #24c56a;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
  }
</style>
`,
      'src/lib/MyButton.story.svelte': `<script>
  import MyButton from './MyButton.svelte'

  const { Hst } = $props()
</script>

<Hst.Story title="MyButton">
  <Hst.Variant title="default">
    <MyButton />
  </Hst.Variant>
  <Hst.Variant title="custom label">
    <MyButton label="Hello Poveste" />
  </Hst.Variant>
</Hst.Story>
`,
    },
  }
}

function nuxtStarter(): Starter {
  return {
    openFile: 'components/MyButton.story.vue',
    manifest: manifest('poveste-nuxt-starter', {
      '@poveste/plugin-nuxt': POVESTE,
      '@poveste/plugin-vue': POVESTE,
      // Nuxt only moved to Vite 8 in 4.5 — 4.5.2's `@nuxt/vite-builder`
      // resolves `vite ^8.2.0`. This is also the floor set in #39. Held below
      // 4.6, whose dev error reporter constructs a `BroadcastChannel` that
      // StackBlitz's WebContainer throws on (#1244).
      'nuxt': '~4.5.2',
      // StackBlitz runs npm 10, which crashes with `Cannot read properties of null
      // (reading 'edgesOut')` (npm/cli#9787) on a Nuxt tree with Vite 8.3.4 or older,
      // whose peer range for `@vitejs/devtools` stops short of the 0.8 that
      // `@nuxt/devtools` resolves. 8.3.5 admits it (#1485).
      'vite': '^8.3.5',
      'vue': '^3.5.26',
    }),
    files: {
      'nuxt.config.ts': `export default defineNuxtConfig({
  compatibilityDate: '2024-12-20',
})
`,
      'poveste.config.ts': `import { HstNuxt } from '@poveste/plugin-nuxt'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue(), HstNuxt()],
})
`,
      'components/MyButton.vue': `<script setup>
defineProps({
  label: { type: String, default: 'Click me' },
})
</script>

<template>
  <button class="my-button">{{ label }}</button>
</template>

<style scoped>
.my-button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #24c56a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
</style>
`,
      'components/MyButton.story.vue': `<script setup>
import MyButton from './MyButton.vue'
</script>

<template>
  <Story title="MyButton">
    <Variant title="default">
      <MyButton />
    </Variant>
  </Story>
</template>
`,
    },
  }
}

function solidStarter(): Starter {
  return {
    openFile: 'src/MyButton.story.tsx',
    manifest: manifest(
      'poveste-solid-starter',
      {
        '@poveste/plugin-solid': POVESTE,
        // The plugin's own peer ranges. npm resolves the newest 2.11, and 2.11.11
        // is the first to peer Vite 8.
        'vite': VITE,
        'vite-plugin-solid': '^2.11.0',
      },
      { 'solid-js': '^1.9.0' },
    ),
    files: {
      'vite.config.ts': `import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
})
`,
      // Setting `storyMatch` replaces the defaults, which find only Vue and
      // Svelte stories (#1124).
      'poveste.config.ts': `import { HstSolid } from '@poveste/plugin-solid'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstSolid()],
  storyMatch: ['**/*.story.tsx'],
})
`,
      'src/MyButton.tsx': `import type { JSX } from 'solid-js'

export function MyButton(props: { label?: string, onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent> }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        'padding': '8px 16px',
        'border': 'none',
        'border-radius': '6px',
        'background': '#24c56a',
        'color': '#fff',
        'font-weight': '600',
        'cursor': 'pointer',
      }}
    >
      {props.label ?? 'Click me'}
    </button>
  )
}
`,
      'src/MyButton.story.tsx': `import { defineStory } from '@poveste/plugin-solid'
import { MyButton } from './MyButton'

export default defineStory<{ clicks: number }>({
  title: 'MyButton',
  // Names the component the Docs tab documents.
  component: MyButton,
  variants: [
    { title: 'default', render: () => <MyButton /> },
    {
      title: 'counting clicks',
      initState: () => ({ clicks: 0 }),
      render: ({ state, setState }) => (
        <MyButton label={\`Clicks: \${state.clicks}\`} onClick={() => setState('clicks', c => c + 1)} />
      ),
    },
  ],
})
`,
    },
  }
}

function reactStarter(): Starter {
  return {
    openFile: 'src/MyButton.story.tsx',
    manifest: manifest(
      'poveste-react-starter',
      {
        '@poveste/plugin-react': POVESTE,
        // Each inside the plugin's peer range, and held to a minor: the starters
        // run in a WebContainer nobody tests upstream releases against, and a
        // floating range is how Nuxt 4.6 broke one with no change here (#1244).
        // React ships no types of its own: without them auto-docs reads every
        // React type as `any`, and an `on*` handler is not an event.
        '@types/react': '~19.3.0',
        '@vitejs/plugin-react': '~6.1.0',
        'vite': VITE,
      },
      { 'react': '~19.3.0', 'react-dom': '~19.3.0' },
    ),
    files: {
      'vite.config.ts': `import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
})
`,
      // No `storyMatch`: the plugin adds its own story patterns (#1267).
      'poveste.config.ts': `import { HstReact } from '@poveste/plugin-react'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstReact()],
})
`,
      'src/MyButton.tsx': `import type { MouseEventHandler } from 'react'

export function MyButton(props: { label?: string, onClick?: MouseEventHandler<HTMLButtonElement> }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        padding: '8px 16px',
        border: 'none',
        borderRadius: '6px',
        background: '#24c56a',
        color: '#fff',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {props.label ?? 'Click me'}
    </button>
  )
}
`,
      'src/MyButton.story.tsx': `import { defineStory } from '@poveste/plugin-react'
import { MyButton } from './MyButton'

export default defineStory<{ clicks: number }>({
  title: 'MyButton',
  // Names the component the Docs tab documents.
  component: MyButton,
  variants: [
    { title: 'default', render: () => <MyButton /> },
    {
      title: 'counting clicks',
      initState: () => ({ clicks: 0 }),
      render: ({ state, setState }) => (
        <MyButton label={\`Clicks: \${state.clicks}\`} onClick={() => setState(s => ({ clicks: s.clicks + 1 }))} />
      ),
    },
  ],
})
`,
    },
  }
}

function quasarStarter(): Starter {
  return {
    openFile: 'src/MyButton.story.vue',
    manifest: manifest(
      'poveste-quasar-starter',
      {
        '@poveste/plugin-quasar': POVESTE,
        '@poveste/plugin-vue': POVESTE,
        // The plugin's own peer floor. It brings `@vitejs/plugin-vue` and
        // `@quasar/vite-plugin` itself, so neither is listed here.
        '@quasar/app-vite': '^3.8.0',
        'vite': VITE,
      },
      { quasar: '^2.24.0', vue: '^3.5.43' },
    ),
    files: {
      // The least Quasar accepts as a project: the plugin reads the Vite config
      // Quasar builds from this file, and Quasar ends the process without an
      // `index.html` beside it.
      //
      // No `src/css/quasar.variables.*`, on purpose. Without one Quasar serves
      // its prebuilt `quasar.css`; with one it compiles its Sass source, through
      // `sass-embedded`, whose compiler is a native binary a WebContainer cannot
      // be assumed to run.
      'quasar.config.js': `export default function () {
  return {
    build: { vueRouterMode: 'hash' },
    framework: { config: {} },
  }
}
`,
      'index.html': `<!doctype html>
<html>
  <head>
    <title>Poveste + Quasar starter</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <!-- quasar:entry-point -->
  </body>
</html>
`,
      'poveste.config.ts': `import { HstQuasar } from '@poveste/plugin-quasar'
import { HstVue } from '@poveste/plugin-vue'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [HstVue(), HstQuasar()],
  setupFile: '/src/poveste.setup.ts',
})
`,
      'src/poveste.setup.ts': `import { setupQuasar } from '@poveste/plugin-quasar/setup'
import { defineSetupVue } from '@poveste/plugin-vue'

export const setupVue = defineSetupVue(setupQuasar())
`,
      'src/MyButton.vue': `<script setup>
defineProps({
  label: { type: String, default: 'Click me' },
})
</script>

<template>
  <q-btn color="primary" unelevated no-caps :label="label" />
</template>
`,
      'src/MyButton.story.vue': `<script setup>
import MyButton from './MyButton.vue'
</script>

<template>
  <Story title="MyButton">
    <Variant title="default">
      <MyButton />
    </Variant>
    <Variant title="custom label">
      <MyButton label="Hello Poveste" />
    </Variant>
  </Story>
</template>
`,
    },
  }
}

export const starters: Record<Framework, () => Starter> = {
  vue: vueStarter,
  svelte: svelteStarter,
  sveltekit: svelteKitStarter,
  nuxt: nuxtStarter,
  solid: solidStarter,
  react: reactStarter,
  quasar: quasarStarter,
}

export const titles: Record<Framework, string> = {
  vue: 'Poveste + Vue starter',
  svelte: 'Poveste + Svelte starter',
  sveltekit: 'Poveste + SvelteKit starter',
  nuxt: 'Poveste + Nuxt starter',
  solid: 'Poveste + Solid starter',
  react: 'Poveste + React starter',
  quasar: 'Poveste + Quasar starter',
}

// What a button calls the framework, so seven of them are not one name to a screen reader (#1342).
export const names: Record<Framework, string> = {
  vue: 'Vue',
  svelte: 'Svelte',
  sveltekit: 'SvelteKit',
  nuxt: 'Nuxt',
  solid: 'Solid',
  react: 'React',
  quasar: 'Quasar',
}
