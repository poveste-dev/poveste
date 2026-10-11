# SvelteKit 3 example

A conformance book: a SvelteKit 3 project, as `sv create` scaffolds it, carrying the conformance story set under `src/lib/conformance/` (#1205). It proves the Kit 3 range of `@poveste/plugin-svelte` in dev, build and preview, and with `svelte-check` (#1200). `examples/sveltekit` stays on Kit 2 for the floor.

```sh
pnpm run story:dev
pnpm run story:build && pnpm run story:preview
```
