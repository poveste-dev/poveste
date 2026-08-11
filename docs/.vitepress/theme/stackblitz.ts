import type { OpenFileOption, Project, ProjectFiles } from '@stackblitz/sdk'
import sdk from '@stackblitz/sdk'

// "Try it live" launches a minimal Poveste book in StackBlitz, built entirely
// in-memory (no pre-created projects or starter repos to maintain — same
// approach as unovis). The starters always install the latest published
// packages from npm.
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
const POVESTE = 'latest'

// poveste >=0.3 peers `vite: ^8.0.0`; the catalog and `@nuxt/vite-builder` both
// land on ^8.2.0.
const VITE = '^8.2.0'

type Framework = 'vue3' | 'svelte3' | 'nuxt3'

interface Starter {
  files: ProjectFiles
  openFile: OpenFileOption
}

function pkg(name: string, extraDev: Record<string, string>, deps: Record<string, string> = {}) {
  return `${JSON.stringify(
    {
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
    },
    null,
    2,
  )}\n`
}

function vue3Starter(): Starter {
  return {
    openFile: 'src/MyButton.story.vue',
    files: {
      'package.json': pkg(
        'poveste-vue3-starter',
        {
          '@poveste/plugin-vue': POVESTE,
          // v6 peers `^5 || ^6 || ^7 || ^8`, so it already spans Vite 8.
          '@vitejs/plugin-vue': '^6.0.0',
          'vite': VITE,
        },
        { vue: '^3.5.26' },
      ),
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

function svelte3Starter(): Starter {
  return {
    openFile: 'src/MyButton.story.svelte',
    files: {
      'package.json': pkg('poveste-svelte-starter', {
        '@poveste/plugin-svelte': POVESTE,
        // v6 stops at `vite ^6.3 || ^7`; v7 is the first release to peer Vite 8,
        // and it in turn requires `svelte ^5.46.4`.
        '@sveltejs/vite-plugin-svelte': '^7.0.0',
        'svelte': '^5.46.4',
        'vite': VITE,
      }),
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
  export let label = 'Click me'
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

  export let Hst
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

function nuxt3Starter(): Starter {
  return {
    openFile: 'components/MyButton.story.vue',
    files: {
      'package.json': pkg('poveste-nuxt-starter', {
        '@poveste/plugin-nuxt': POVESTE,
        '@poveste/plugin-vue': POVESTE,
        // Nuxt only moved to Vite 8 in 4.5 — 4.5.2's `@nuxt/vite-builder`
        // resolves `vite ^8.2.0`. This is also the floor set in #39.
        'nuxt': '^4.5.2',
        'vite': VITE,
        'vue': '^3.5.26',
      }),
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

const starters: Record<Framework, () => Starter> = {
  vue3: vue3Starter,
  svelte3: svelte3Starter,
  nuxt3: nuxt3Starter,
}

const titles: Record<Framework, string> = {
  vue3: 'Poveste + Vue 3 starter',
  svelte3: 'Poveste + Svelte starter',
  nuxt3: 'Poveste + Nuxt starter',
}

export function launchStackBlitz(framework: string): void {
  const build = starters[framework as Framework]
  if (!build) {
    return
  }
  const starter = build()
  const project: Project = {
    title: titles[framework as Framework],
    description: 'A minimal Poveste book — edit a component or its .story file and watch it update live.',
    template: 'node',
    files: starter.files,
  }
  sdk.openProject(project, { openFile: starter.openFile })
}
