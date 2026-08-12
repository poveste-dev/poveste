# Poveste + Svelte 5 and SvelteKit

Requires `svelte@^5.46.4` and `@sveltejs/vite-plugin-svelte@^7.0.0`. SvelteKit is supported
by this same package — there is no separate plugin — through an optional
`@sveltejs/kit@^2.53.0` peer.

The floor is not `^5.0.0` for a reason: Poveste requires Vite 8, only
`@sveltejs/vite-plugin-svelte` v7 peers Vite 8, and v7 in turn requires `svelte@^5.46.4`.
Svelte `5.0`–`5.46.3` cannot be assembled into a working project at all.

```bash
pnpm add -D poveste @poveste/plugin-svelte
```

Register the plugin in your Poveste config:

```ts
import { HstSvelte } from '@poveste/plugin-svelte'
import { defineConfig } from 'poveste'

export default defineConfig({
  plugins: [
    HstSvelte(),
  ],
})
```

Write stories as `*.story.svelte`. State that your controls drive belongs on `initState`,
and your content reads it from the snippet:

```svelte
<script>
  import MyButton from './MyButton.svelte'

  export let Hst

  const initState = () => ({ disabled: false })
</script>

<Hst.Story title="MyButton" {initState}>
  {#snippet children({ state })}
    <MyButton disabled={state.disabled} />
  {/snippet}

  {#snippet controls({ state })}
    <Hst.Checkbox bind:value={state.disabled} title="Disabled" />
  {/snippet}
</Hst.Story>
```

> **Coming from histoire?** Story state must move onto `initState`. Svelte 5 removed the API
> histoire used to read a story's state, so a plain `let` in your story no longer reaches the
> preview — Poveste owns the state instead. A story with controls but no `initState` logs an
> error explaining this.
>
> [How, and why](https://poveste.dev/guide/migration-from-histoire.html#svelte-story-state-moves-to-initstate)

[Svelte guide](https://poveste.dev/guide/svelte/getting-started.html) ·
[SvelteKit](https://poveste.dev/guide/svelte/getting-started.html#sveltekit) ·
[Documentation](https://poveste.dev)
