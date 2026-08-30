# Migrating from Histoire

**poveste** is a community-maintained, **drop-in fork** of
[histoire](https://github.com/histoire-dev/histoire). It keeps the same
`<Story>` / `<Variant>` API, the same `.story.*` file convention, and the same
configuration format — so for Vue and Nuxt, migrating is a matter of swapping dependencies.

**Svelte projects need one code change too.** Svelte 5 removed the API histoire relied on to
read a story's state, so story state moves onto `initState` — see
[Svelte: story state moves to `initState`](#svelte-story-state-moves-to-initstate) below.

::: tip TL;DR
Replace `histoire` → `poveste` and `@histoire/*` → `@poveste/*` in your
`package.json`, reinstall, and you're done. The API, story files, config, CLI,
CSS variables, and render classes all keep working. The **one** thing that moves
is the build output directory (`.histoire/dist` → `.poveste/dist`) — update it
only if you deploy or ignore that path (see step 5).

**Svelte only:** stories that use controls also need their state moved onto `initState`
([below](#svelte-story-state-moves-to-initstate)).
:::

::: warning Check your versions first
Poveste's floors are higher than histoire's — it requires Vite 8, and with it Nuxt 4.5+
and Svelte 5+. If your project is below any of them, that upgrade comes first and is the
real work; the dependency swap below is the easy part. See
[supported versions](./getting-started.md#supported-versions).
:::

## 1. Swap the dependencies

Rename the packages in your `package.json`:

| histoire | poveste |
| --- | --- |
| `histoire` | `poveste` |
| `@histoire/plugin-vue` | `@poveste/plugin-vue` |
| `@histoire/plugin-svelte` | `@poveste/plugin-svelte` |
| `@histoire/plugin-nuxt` | `@poveste/plugin-nuxt` |
| `@histoire/plugin-percy` | `@poveste/plugin-percy` |
| `@histoire/plugin-screenshot` | `@poveste/plugin-screenshot` |

Then reinstall:

```bash
pnpm install
```

## 2. Update your config file

Your existing `histoire.config.ts` **keeps working as-is** — poveste resolves it
as a fallback. To fully adopt the new name, rename it (optional):

```bash
mv histoire.config.ts poveste.config.ts
```

Update the imports inside it:

```ts
// poveste.config.ts
import { HstVue } from '@poveste/plugin-vue' // was: '@histoire/plugin-vue'
import { defineConfig } from 'poveste' // was: 'histoire'

export default defineConfig({
  plugins: [HstVue()],
})
```

`defineConfig` is unchanged. If you type your config explicitly, the
`HistoireConfig` type is still exported as a deprecated alias of `PovesteConfig`.

## 3. Update npm scripts (optional)

The `histoire` CLI command **still works** (it's kept as an alias). To switch to
the new name:

```jsonc
{
  "scripts": {
    "story:dev": "poveste dev", // was: "histoire dev"
    "story:build": "poveste build", // was: "histoire build"
    "story:preview": "poveste preview"
  }
}
```

## 4. Vite config key (if you used it)

If you configured poveste through your `vite.config.ts` instead of a config file,
the key is now `poveste` — the old `histoire` key still works:

```ts
// vite.config.ts
export default defineConfig({
  poveste: { // was: histoire
    // ...
  },
})
```

## 5. Build output directory (action needed if you deploy it)

The default output directory was renamed from `.histoire/dist` to `.poveste/dist`
(and the story-data manifest from `histoire.json` to `poveste.json`, screenshots
from `.histoire/screenshots` to `.poveste/screenshots`). This is the only default
that changed. If you **explicitly set `outDir`** in your config, you're unaffected.

Otherwise, update anywhere that references the old path:

```diff
# .gitignore
- .histoire/dist/
+ .poveste/dist/
```

```diff
# deploy config (Netlify, Vercel, CI artifact path, Lost Pixel, …)
- publish = ".histoire/dist"
+ publish = ".poveste/dist"
```

Prefer zero changes? Pin the old path explicitly in your config:

```ts
export default defineConfig({
  outDir: '.histoire/dist',
})
```

## Svelte: story state moves to `initState`

The one code change in the whole migration, and it applies to Svelte only. If your Svelte
stories have no controls, there is nothing to do here.

Histoire read your story's state out of the component itself, using Svelte 4's
`$capture_state` / `$inject_state`. **Svelte 5 removed both and offers no replacement** —
component internals are private now. That is upstream, not a poveste decision, and it leaves no
way to read a `let` out of your story.

It matters because Poveste mounts your story **once per slot** — once to fill the controls
panel, once to render the story. A component-local variable therefore exists twice, and a
control writes to one copy while your markup reads the other. Under histoire the capture/inject
pass hid that; without it, controls silently stop working.

So state moves onto the variant, where Poveste owns it — the same model the Vue plugin has
always used:

```svelte
<!-- histoire -->
<script>
  export let Hst

  let disabled = false
</script>

<Hst.Story>
  <MyButton {disabled} />

  <svelte:fragment slot="controls">
    <Hst.Checkbox bind:value={disabled} title="Disabled" />
  </svelte:fragment>
</Hst.Story>
```

```svelte
<!-- poveste -->
<script>
  export let Hst

  const initState = () => ({ disabled: false })
</script>

<Hst.Story {initState}>
  {#snippet children({ state })}
    <MyButton disabled={state.disabled} />
  {/snippet}

  {#snippet controls({ state })}
    <Hst.Checkbox bind:value={state.disabled} title="Disabled" />
  {/snippet}
</Hst.Story>
```

Three things changed: the `let` became `initState`, the slots became snippets that receive
`state`, and every read went from `disabled` to `state.disabled`.

Values that are genuinely local — a `bind:this` node, a DOM ref — stay in the component. Only
what your controls drive needs to move.

A `source` prop that reflected state also becomes a function, since props are evaluated in your
`<script>` where `state` is not in scope:

```svelte
<script>
  export let Hst

  const initState = () => ({ disabled: false })

  function source(state) {
    return `<MyButton${state.disabled ? ' disabled' : ''} />`
  }
</script>

<Hst.Story {initState} {source}>
  {#snippet children({ state })}
    <MyButton disabled={state.disabled} />
  {/snippet}
</Hst.Story>
```

If you miss one, Poveste tells you: a story with a controls slot and no `initState` logs an
error naming the story and linking back here. Full details in
[State & Controls](./svelte/controls.md).

## What you do NOT need to change

- **Story files** — the `.story.vue` / `.story.svelte` convention is unchanged.
- **The `<Story>` and `<Variant>` API** — identical for Vue and Nuxt, including all props and
  slots. Svelte gains an `initState` prop and moves slots to snippets (see above).
- **Plugin options** — same shapes.
- **Controls** (`Hst*` components) — unchanged.

## Compatibility summary

| Surface | Status |
| --- | --- |
| `histoire.config.*` filename | ✅ still resolved (fallback) |
| `histoire` CLI command | ✅ still works (alias) |
| `histoire` key in Vite config | ✅ still works (deprecated) |
| `HistoireConfig` type | ✅ still exported (deprecated alias) |
| `<Story>` / `<Variant>` API (Vue, Nuxt) | ✅ identical |
| `<Story>` / `<Variant>` API (Svelte) | ⚠️ state moves to `initState` ([why](#svelte-story-state-moves-to-initstate)) |
| `--histoire-contrast-color` CSS var | ✅ still set (alongside `--poveste-contrast-color`) |
| `.histoire-generic-render-story` / `.histoire-wrapper` render classes | ✅ still emitted (for visual-regression selectors) |
| `.histoire/dist` output dir default | ⚠️ renamed to `.poveste/dist` (see step 5) |

These compatibility shims are kept to make migration painless. They may be
removed in a future major version, so adopting the `poveste.*` names is recommended.

### Custom theme CSS

The app's internal CSS classes were renamed from `histoire-*` to `poveste-*`. The
classes you're most likely to target keep **both** names, so existing theme/test
CSS keeps working:

- Story render/mount wrappers: `.poveste-generic-render-story` (+ `.histoire-generic-render-story`), `.poveste-wrapper` (+ `.histoire-wrapper`)
- Code blocks: `.__poveste-code` (+ `.__histoire-code`)

If your theme targets other app-chrome classes directly (e.g. `.histoire-app-header`),
update them to the `poveste-` prefix.

## Warnings you will not see

### `The CJS build of Vite's Node API is deprecated`

Gone — but the credit belongs to Vite, not to Poveste. Vite dropped the CJS Node API build
entirely in Vite 7, so `vite`'s package `exports` no longer has a `require` condition and
there is no CJS entry point left to warn about. Poveste requires Vite 8, so the warning has
no code path to come from.

This is worth stating plainly: **migrating is not what fixes it.** Any tool on Vite 7 or
newer is equally past it, [histoire's own `1.0.0-beta.1`](https://www.npmjs.com/package/histoire)
included. If this warning is your only reason to switch, upgrading histoire is the smaller
change.

Reported upstream as [histoire#675](https://github.com/histoire-dev/histoire/issues/675).
Note that that thread also collects an unrelated `ERR_UNSUPPORTED_DIR_IMPORT` failure in
story collection; if that is what you are hitting, see
[`viteNodeInlineDeps`](../reference/config.md#vitenodeinlinedeps).

## Something broke?

If you hit a migration issue that isn't covered here, please
[open an issue](https://github.com/poveste-dev/poveste/issues) — smoothing the
path from histoire is a priority.
