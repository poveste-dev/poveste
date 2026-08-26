# SvelteKit example

A SvelteKit application with Poveste wired in, used as a fixture: its story build,
Playwright suite and `svelte-check` run in CI as the `sveltekit` project, so this
is what proves the SvelteKit integration rather than a sentence in the docs.

SvelteKit is supported through `@poveste/plugin-svelte` — there is no separate
Kit plugin. Kit's own module graph is what makes it worth a separate example.

## Running it

From the repository root — the workspace is installed once, not per example:

```bash
pnpm install
pnpm run build
```

Then, in this directory:

```bash
pnpm run story:dev      # the book, on a dev server
pnpm run story:build    # build it
pnpm run story:preview  # serve the built book
pnpm run dev            # the SvelteKit app itself
```

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the wider development loop, and
the [Svelte guide](https://poveste.dev/guide/svelte/getting-started.html) for how
to set this up in your own project.
