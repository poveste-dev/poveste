import type { Plugin, PluginApiBase } from '@poveste/shared'
import { findUp } from '../util/find-up.js'
import { getInjectedImport } from '../util/vendors.js'

export interface TailwindTokensOptions {
  /**
   * Path to the CSS entrypoint that imports Tailwind and declares `@theme`.
   * Tailwind v4 is CSS-first, so the design tokens are read from CSS rather
   * than from a JS config. Auto-detected when omitted.
   */
  cssFile?: string
}

const CSS_ENTRY_CANDIDATES = [
  'src/style.css',
  'src/styles.css',
  'src/main.css',
  'src/index.css',
  'src/app.css',
  'src/assets/main.css',
  'src/assets/style.css',
  'styles/globals.css',
  'app/globals.css',
  'style.css',
  'styles.css',
]

export function tailwindTokens(options: TailwindTokensOptions = {}): Plugin {
  const tailwindCssFile = options.cssFile ?? findUp(process.cwd(), CSS_ENTRY_CANDIDATES)

  async function generate(api: PluginApiBase) {
    try {
      await api.fs.ensureDir(api.pluginTempDir)
      await api.fs.emptyDir(api.pluginTempDir)
      api.moduleLoader.clearCache()
      await api.fs.writeFile(api.path.resolve(api.pluginTempDir, 'style.css'), css)
      const theme = await loadTailwindTheme(api, tailwindCssFile)
      const storyFile = api.path.resolve(api.pluginTempDir, 'Tailwind.story.js')
      await api.fs.writeFile(storyFile, storyTemplate({ theme }))
      api.addStoryFile(storyFile)
    }
    catch (e) {
      api.error(e.stack ?? e.message)
    }
  }

  return {
    name: 'builtin:tailwind-tokens',

    config(config) {
      if (tailwindCssFile) {
        // Add 'design-system' group
        if (!config.tree) {
          config.tree = {}
        }
        if (!config.tree.groups) {
          config.tree.groups = []
        }
        if (!config.tree.groups.some(g => g.id === 'design-system')) {
          let index = 0
          // After 'top' group
          const topIndex = config.tree.groups.findIndex(g => g.id === 'top')
          if (topIndex > -1) {
            index = topIndex + 1
          }
          // Insert group
          config.tree.groups.splice(index, 0, {
            id: 'design-system',
            title: 'Design System',
          })
        }
      }
    },

    onDev(api, onCleanup) {
      if (tailwindCssFile) {
        const watcher = api.watcher.watch(tailwindCssFile)
          .on('change', () => generate(api))
          .on('add', () => generate(api))
        onCleanup(() => {
          watcher.close()
        })
      }
    },

    async onBuild(api) {
      if (tailwindCssFile) {
        await generate(api)
      }
    },
  }
}

/**
 * Tailwind v4 keeps its theme as flat CSS custom properties rather than a
 * resolved JS config (`resolveConfig` is gone). Load the design system from the
 * project's CSS entrypoint and reshape its variables into the grouped structure
 * the story template renders.
 */
async function loadTailwindTheme(api: PluginApiBase, cssFile: string) {
  const { __unstable__loadDesignSystem } = await import('tailwindcss')
  const { createRequire } = await import('node:module')

  const base = api.path.dirname(cssFile)
  const designSystem = await __unstable__loadDesignSystem(
    await api.fs.readFile(cssFile, 'utf8'),
    {
      base,
      loadStylesheet: async (id: string, importBase: string) => {
        const resolved = id.startsWith('.')
          ? api.path.resolve(importBase, id)
          : createRequire(`${importBase}/`).resolve(id)
        return {
          path: resolved,
          base: api.path.dirname(resolved),
          content: await api.fs.readFile(resolved, 'utf8'),
        }
      },
    },
  )

  const vars = new Map<string, string>(
    [...designSystem.theme.entries()].map(([key, entry]: [string, any]) => [key, entry.value]),
  )

  /** All values in a `--namespace-*` group, keyed by their remainder. */
  function group(namespace: string, exclude?: RegExp) {
    const out: Record<string, string> = {}
    const prefix = `${namespace}-`
    for (const [key, value] of vars) {
      if (!key.startsWith(prefix)) continue
      if (exclude?.test(key)) continue
      out[key.slice(prefix.length)] = value
    }
    return out
  }

  /** Colours are rendered as shade sets: `red-500` -> `{ red: { 500: … } }`. */
  function colors() {
    const out: Record<string, any> = {}
    for (const [key, value] of Object.entries(group('--color'))) {
      const match = key.match(/^(.*)-(\d+)$/)
      if (match) {
        out[match[1]] ??= {}
        out[match[1]][match[2]] = value
      }
      else {
        out[key] = value
      }
    }
    return out
  }

  // v4 generates the spacing scale on demand from a single `--spacing` base,
  // so the conventional steps are reconstructed here for display.
  const SPACING_STEPS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96]
  function spacing() {
    const unit = vars.get('--spacing') ?? '0.25rem'
    const out: Record<string, string> = {}
    for (const step of SPACING_STEPS) {
      out[String(step)] = step === 0 ? '0px' : `calc(${unit} * ${step})`
    }
    return out
  }

  const palette = colors()
  const scale = spacing()

  return {
    backgroundColor: palette,
    textColor: palette,
    borderColor: palette,
    padding: scale,
    margin: scale,
    width: scale,
    height: scale,
    fontSize: group('--text', /--line-height$|--letter-spacing$|--font-weight$/),
    fontWeight: group('--font-weight'),
    fontFamily: group('--font', /^--font-weight-/),
    letterSpacing: group('--tracking'),
    lineHeight: group('--leading'),
    dropShadow: group('--drop-shadow'),
    borderRadius: group('--radius'),
    // v4 has no border-width namespace; these are the built-in static utilities.
    borderWidth: { DEFAULT: '1px', 0: '0px', 2: '2px', 4: '4px', 8: '8px' },
  }
}

function storyTemplate(tailwindConfig: any) {
  return `
import 'poveste-style'
import './style.css'
import { createApp, h, markRaw, ref } from ${getInjectedImport('@poveste/vendors/vue')}
import {
  HstColorShades,
  HstTokenList,
  HstTokenGrid,
  HstText,
  HstTextarea,
  HstNumber,
} from ${getInjectedImport('@poveste/controls')}

const config = markRaw(${JSON.stringify(tailwindConfig, null, 2)})
const search = ref('')
const sampleText = ref('Cat sit like bread eat prawns daintily with a claw then lick paws clean wash down prawns with a lap of carnation milk then retire to the warmest spot on the couch to claw at the fabric before taking a catnap mrow cat cat moo moo lick ears lick paws')
const fontSize = ref(16)

function mountApp ({ el, state, onUnmount }, render) {
  Object.assign(state, {
    search,
    sampleText,
    fontSize,
  })

  const app = createApp({
    render,
  })
  app.mount(el)

  onUnmount(() => {
    app.unmount()
  })
}

export default {
  id: 'tailwind',
  title: 'Tailwind',
  group: 'design-system',
  icon: 'mdi:tailwind',
  responsiveDisabled: true,
  layout: { type: 'single', iframe: false },
  variants: [
    {
      id: 'background-color',
      title: 'Background Color',
      icon: 'carbon:color-palette',
      onMount: (api) => mountApp(api, () => Object.entries(config.theme.backgroundColor).map(([key, shades]) => h(HstColorShades, {
        key,
        shades: typeof shades === 'object' ? shades : { DEFAULT: shades },
        getName: shade => '' + (shade === 'DEFAULT' ? \`bg-\${key}\` : \`bg-\${key}-\${shade}\`),
        search: search.value,
      }, ({ color}) => h('div', {
        class: '__pvt-shade',
        style: {
          backgroundColor: color.replace('<alpha-value>', 1),
        },
      })))),
      onMountControls: (api) => mountApp(api, () => [
        h(HstText, {
          title: 'Filter...',
          modelValue: search.value,
          'onUpdate:modelValue': value => { search.value = value },
        }),
      ]),
    },
    {
      id: 'text-color',
      title: 'Text Color',
      icon: 'carbon:text-color',
      onMount: (api) => mountApp(api, () => Object.entries(config.theme.textColor).map(([key, shades]) => h(HstColorShades, {
        key,
        shades: typeof shades === 'object' ? shades : { DEFAULT: shades },
        getName: shade => '' + (shade === 'DEFAULT' ? \`text-\${key}\` : \`text-\${key}-\${shade}\`),
        search: search.value,
      }, ({ color}) => h('div', {
        class: '__pvt-shade __pvt-text',
        style: {
          color: color.replace('<alpha-value>', 1),
        },
      }, 'Aa')))),
      onMountControls: (api) => mountApp(api, () => [
        h(HstText, {
          title: 'Filter...',
          modelValue: search.value,
          'onUpdate:modelValue': value => { search.value = value },
        }),
      ]),
    },
    {
      id: 'border-color',
      title: 'Border Color',
      icon: 'carbon:color-palette',
      onMount: (api) => mountApp(api, () => Object.entries(config.theme.borderColor).map(([key, shades]) => h(HstColorShades, {
        key,
        shades: typeof shades === 'object' ? shades : { DEFAULT: shades },
        getName: shade => '' + (shade === 'DEFAULT' ? \`border-\${key}\` : \`border-\${key}-\${shade}\`),
        search: search.value,
      }, ({ color}) => h('div', {
        class: '__pvt-shade __pvt-border',
        style: {
          borderColor: color.replace('<alpha-value>', 1),
        },
      })))),
      onMountControls: (api) => mountApp(api, () => [
        h(HstText, {
          title: 'Filter...',
          modelValue: search.value,
          'onUpdate:modelValue': value => { search.value = value },
        }),
      ]),
    },
    {
      id: 'padding',
      title: 'Padding',
      icon: 'carbon:area',
      onMount: (api) => mountApp(api, () => h(HstTokenList, {
        tokens: config.theme.padding,
        getName: key => \`\p-\${key}\`,
      }, ({ token }) => h('div', {
        class: '__pvt-padding',
        style: {
          padding: token.value,
        },
      }, [
        h('div', {
          class: '__pvt-padding-box',
        }),
      ]))),
    },
    {
      id: 'margin',
      title: 'Margin',
      icon: 'carbon:area',
      onMount: (api) => mountApp(api, () => h(HstTokenList, {
        tokens: config.theme.margin,
        getName: key => \`\m-\${key}\`,
      }, ({ token }) => h('div', {
        class: '__pvt-margin',
      }, [
        h('div', {
          class: '__pvt-margin-box',
          style: {
            margin: token.value,
          },
        }),
      ]))),
    },
    {
      id: 'font-size',
      title: 'Font Size',
      icon: 'carbon:text-font',
      onMount: (api) => mountApp(api, () => h(HstTokenList, {
        tokens: config.theme.fontSize,
        getName: key => \`\text-\${key}\`,
      }, ({ token }) => h('div', {
        class: '__pvt-truncate',
        style: {
          fontSize: Array.isArray(token.value) ? token.value[0] : token.value,
          ...(Array.isArray(token.value) && typeof token.value[1] === "object" ? token.value[1] : { lineHeight: token.value[1] })
        },
      }, sampleText.value))),
      onMountControls: (api) => mountApp(api, () => [
        h(HstTextarea, {
          title: 'Sample text',
          modelValue: sampleText.value,
          'onUpdate:modelValue': value => { sampleText.value = value },
          rows: 5,
        }),
      ]),
    },
    {
      id: 'font-weight',
      title: 'Font Weight',
      icon: 'carbon:text-font',
      onMount: (api) => mountApp(api, () => h(HstTokenList, {
        tokens: config.theme.fontWeight,
        getName: key => \`\font-\${key}\`,
      }, ({ token }) => h('div', {
        class: '__pvt-truncate',
        style: {
          fontWeight: token.value,
          fontSize: \`\${fontSize.value}px\`,
        },
      }, sampleText.value))),
      onMountControls: (api) => mountApp(api, () => [
        h(HstTextarea, {
          title: 'Sample text',
          modelValue: sampleText.value,
          'onUpdate:modelValue': value => { sampleText.value = value },
          rows: 5,
        }),
        h(HstNumber, {
          title: 'Font size',
          modelValue: fontSize.value,
          'onUpdate:modelValue': value => { fontSize.value = value },
          min: 1,
        }),
      ]),
    },
    {
      id: 'font-family',
      title: 'Font Family',
      icon: 'carbon:text-font',
      onMount: (api) => mountApp(api, () => h(HstTokenList, {
        tokens: config.theme.fontFamily,
        getName: key => \`\font-\${key}\`,
      }, ({ token }) => h('div', {
        class: '__pvt-truncate',
        style: {
          fontFamily: token.value,
          fontSize: \`\${fontSize.value}px\`,
        },
      }, sampleText.value))),
      onMountControls: (api) => mountApp(api, () => [
        h(HstTextarea, {
          title: 'Sample text',
          modelValue: sampleText.value,
          'onUpdate:modelValue': value => { sampleText.value = value },
          rows: 5,
        }),
        h(HstNumber, {
          title: 'Font size',
          modelValue: fontSize.value,
          'onUpdate:modelValue': value => { fontSize.value = value },
          min: 1,
        }),
      ]),
    },
    {
      id: 'letter-spacing',
      title: 'Letter Spacing',
      icon: 'carbon:text-font',
      onMount: (api) => mountApp(api, () => h(HstTokenList, {
        tokens: config.theme.letterSpacing,
        getName: key => \`\tracking-\${key}\`,
      }, ({ token }) => h('div', {
        class: '__pvt-truncate',
        style: {
          letterSpacing: token.value,
          fontSize: \`\${fontSize.value}px\`,
        },
      }, sampleText.value))),
      onMountControls: (api) => mountApp(api, () => [
        h(HstTextarea, {
          title: 'Sample text',
          modelValue: sampleText.value,
          'onUpdate:modelValue': value => { sampleText.value = value },
          rows: 5,
        }),
        h(HstNumber, {
          title: 'Font size',
          modelValue: fontSize.value,
          'onUpdate:modelValue': value => { fontSize.value = value },
          min: 1,
        }),
      ]),
    },
    {
      id: 'line-height',
      title: 'Line Height',
      icon: 'carbon:text-font',
      onMount: (api) => mountApp(api, () => h(HstTokenList, {
        tokens: config.theme.lineHeight,
        getName: key => \`\leading-\${key}\`,
      }, ({ token }) => h('div', {
        style: {
          lineHeight: token.value,
        },
      }, sampleText.value))),
      onMountControls: (api) => mountApp(api, () => [
        h(HstTextarea, {
          title: 'Sample text',
          modelValue: sampleText.value,
          'onUpdate:modelValue': value => { sampleText.value = value },
          rows: 5,
        }),
        // @TODO select font size
      ]),
    },
    {
      id: 'drop-shadow',
      title: 'Drop Shadow',
      icon: 'carbon:shape-except',
      onMount: (api) => mountApp(api, () => h(HstTokenGrid, {
        tokens: config.theme.dropShadow,
        getName: key => '' + (key === 'DEFAULT' ? 'drop-shadow' : \`drop-shadow-\${key}\`),
        colSize: 180,
      }, ({ token }) => h('div', {
        class: '__pvt-drop-shadow',
        style: {
          filter: \`\${(Array.isArray(token.value) ? token.value : [token.value]).map(v => \`drop-shadow(\${v})\`).join(' ')}\`,
        },
      }))),
    },
    {
      id: 'border-radius',
      title: 'Border Radius',
      icon: 'carbon:condition-wait-point',
      onMount: (api) => mountApp(api, () => h(HstTokenGrid, {
        tokens: config.theme.borderRadius,
        getName: key => '' + (key === 'DEFAULT' ? 'rounded' : \`rounded-\${key}\`),
        colSize: 180,
      }, ({ token }) => h('div', {
        class: '__pvt-border-radius',
        style: {
          borderRadius: token.value,
        },
      }))),
    },
    {
      id: 'border-width',
      title: 'Border Width',
      icon: 'carbon:checkbox',
      onMount: (api) => mountApp(api, () => h(HstTokenGrid, {
        tokens: config.theme.borderWidth,
        getName: key => '' + (key === 'DEFAULT' ? 'border' : \`border-\${key}\`),
        colSize: 180,
      }, ({ token }) => h('div', {
        class: '__pvt-border-width',
        style: {
          borderWidth: token.value,
        },
      }))),
    },
    {
      id: 'width',
      title: 'Width',
      icon: 'carbon:pan-horizontal',
      onMount: (api) => mountApp(api, () => h(HstTokenList, {
        tokens: config.theme.width,
        getName: key => '' + (key === 'DEFAULT' ? 'w' : \`w-\${key}\`),
      }, ({ token }) => h('div', {
        class: '__pvt-width',
      }, [
        h('div', {
          class: '__pvt-width-box',
          style: {
            width: token.value,
          },
        }),
      ]))),
    },
    {
      id: 'height',
      title: 'Height',
      icon: 'carbon:pan-vertical',
      onMount: (api) => mountApp(api, () => h(HstTokenList, {
        tokens: config.theme.height,
        getName: key => '' + (key === 'DEFAULT' ? 'h' : \`h-\${key}\`),
      }, ({ token }) => h('div', {
        class: '__pvt-height',
        style: {
          height: token.value,
        },
      }))),
    },
    {
      id: 'full-config',
      title: 'Full Config',
      icon: 'carbon:code',
      onMount: (api) => mountApp(api, () => h('pre', JSON.stringify(config, null, 2))),
    },
  ],
}`
}

const css = `.__pvt-shade {
  height: 80px;
  border-radius: 4px;
}

.__pvt-text {
  font-size: 4rem;
  display: flex;
  align-items: flex-end;
}

.__pvt-border {
  border-style: solid;
  border-width: 2px;
}

.__pvt-padding {
  background-color: rgb(113 113 122 / 0.1);
  width: min-content;
}

.__pvt-margin {
  border: dashed 1px rgb(113 113 122 / 0.5);
  width: min-content;
}

.__pvt-padding-box,
.__pvt-margin-box {
  width: 5rem;
  height: 5rem;
  background-color: rgb(113 113 122 / 0.5);
}

.__pvt-padding,
.__pvt-padding-box,
.__pvt-margin,
.__pvt-margin-box,
.__pvt-drop-shadow {
  border-radius: 4px;
}

.__pvt-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.__pvt-drop-shadow {
  width: 8rem;
  height: 8rem;
  background: white;
  margin-bottom: 0.5rem;
}

.__pvt-drop-shadow {
  background: #4e4e57;
}

.__pvt-border-radius {
  width: 8rem;
  height: 8rem;
  background-color: rgb(113 113 122 / 0.5);
}

.__pvt-border-width {
  width: 8rem;
  height: 8rem;
  border-color: rgb(113 113 122 / 0.5);
  background-color: rgb(113 113 122 / 0.1);
}

.__pvt-width {
  background-color: rgb(113 113 122 / 0.1);
}

.__pvt-width-box,
.__pvt-height {
  background-color: rgb(113 113 122 / 0.5);
}

.__pvt-width-box {
  height: 5rem;
}`
