<p align="center">
  <img src="./logo.svg" alt="Poveste logo" width="256px" height="256px">
</p>

<br>

# Poveste

> Fast and beautiful interactive component playgrounds

**poveste** — /poˈveste/ (_po-VES-teh_), Romanian for "story." A community-maintained,
**drop-in successor** to [histoire](https://github.com/histoire-dev/histoire) by
[Guillaume Chau](https://github.com/Akryum). For **Vue and Nuxt**, existing histoire projects
migrate by swapping one dependency — the `<Story>`/`<Variant>` API, `.story.*` files, and
`histoire.config.*` all keep working. **Svelte** needs one code change as well: Svelte 5 removed
the API histoire used to read a story's state, so story state moves onto `initState`
([how, and why](https://poveste.dev/guide/migration-from-histoire.html#svelte-story-state-moves-to-initstate)).
Say it however you like — we answer to "po-VEST" too. 🙂

[![Test status](https://github.com/poveste-dev/poveste/actions/workflows/test.yml/badge.svg)](https://github.com/poveste-dev/poveste/actions/workflows/test.yml)
[![Test status](https://github.com/poveste-dev/poveste/actions/workflows/test-vue3.yml/badge.svg)](https://github.com/poveste-dev/poveste/actions/workflows/test-vue3.yml)
[![Test status](https://github.com/poveste-dev/poveste/actions/workflows/test-svelte5.yml/badge.svg)](https://github.com/poveste-dev/poveste/actions/workflows/test-svelte5.yml)
[![Test status](https://github.com/poveste-dev/poveste/actions/workflows/test-sveltekit.yml/badge.svg)](https://github.com/poveste-dev/poveste/actions/workflows/test-sveltekit.yml)
[![Test status](https://github.com/poveste-dev/poveste/actions/workflows/test-nuxt4.yml/badge.svg)](https://github.com/poveste-dev/poveste/actions/workflows/test-nuxt4.yml)

[Read the Documentation](https://poveste.dev) |
[Discussions board](https://github.com/poveste-dev/poveste/discussions)

<p align="center">
  <a href="https://poveste.dev">
    <img src="./screenshot.png" alt="Poveste — interactive component playground" width="900">
  </a>
</p>

- ⚡️ Lightning fast development and instant HMR thanks to [Vite](http://vitejs.dev)
- 👓 Build and visually test your components in isolation
- 📚 Document your components with stories and variants
- 📝 Generate source code examples automatically
- 🎨 Beautiful and customizable interface

## Requirements

| | Supported |
| --- | --- |
| Node | `>=26` |
| Vite | `^8.0.0` |
| Vue | `^3.5.26` |
| Nuxt | `^4.5.0` |
| Svelte | `^5.0.0` |
| SvelteKit | `^2.55.0` |

Every range is backed by a CI job that exercises it — see
[supported versions](https://poveste.dev/guide/getting-started.html#supported-versions) for
what proves each one, the package-manager story, and the version-support policy.

## Packages

| Package | Description | Version | Downloads |
| --- | --- | --- | --- |
| [`poveste`](packages/poveste) | Core CLI, config, and builder | <a href="https://npmx.dev/package/poveste"><img src="https://npmx.dev/api/registry/badge/version/poveste" alt="Version"></a> | <a href="https://npmx.dev/package/poveste"><img src="https://npmx.dev/api/registry/badge/downloads/poveste" alt="Downloads"></a> |
| [`@poveste/plugin-vue`](packages/poveste-plugin-vue) | Vue 3 | <a href="https://npmx.dev/package/@poveste/plugin-vue"><img src="https://npmx.dev/api/registry/badge/version/@poveste/plugin-vue" alt="Version"></a> | <a href="https://npmx.dev/package/@poveste/plugin-vue"><img src="https://npmx.dev/api/registry/badge/downloads/@poveste/plugin-vue" alt="Downloads"></a> |
| [`@poveste/plugin-svelte`](packages/poveste-plugin-svelte) | Svelte 5 and SvelteKit | <a href="https://npmx.dev/package/@poveste/plugin-svelte"><img src="https://npmx.dev/api/registry/badge/version/@poveste/plugin-svelte" alt="Version"></a> | <a href="https://npmx.dev/package/@poveste/plugin-svelte"><img src="https://npmx.dev/api/registry/badge/downloads/@poveste/plugin-svelte" alt="Downloads"></a> |
| [`@poveste/plugin-nuxt`](packages/poveste-plugin-nuxt) | Nuxt | <a href="https://npmx.dev/package/@poveste/plugin-nuxt"><img src="https://npmx.dev/api/registry/badge/version/@poveste/plugin-nuxt" alt="Version"></a> | <a href="https://npmx.dev/package/@poveste/plugin-nuxt"><img src="https://npmx.dev/api/registry/badge/downloads/@poveste/plugin-nuxt" alt="Downloads"></a> |
| [`@poveste/plugin-percy`](packages/poveste-plugin-percy) | Visual regression testing with Percy | <a href="https://npmx.dev/package/@poveste/plugin-percy"><img src="https://npmx.dev/api/registry/badge/version/@poveste/plugin-percy" alt="Version"></a> | <a href="https://npmx.dev/package/@poveste/plugin-percy"><img src="https://npmx.dev/api/registry/badge/downloads/@poveste/plugin-percy" alt="Downloads"></a> |
| [`@poveste/plugin-screenshot`](packages/poveste-plugin-screenshot) | Visual regression testing with screenshots | <a href="https://npmx.dev/package/@poveste/plugin-screenshot"><img src="https://npmx.dev/api/registry/badge/version/@poveste/plugin-screenshot" alt="Version"></a> | <a href="https://npmx.dev/package/@poveste/plugin-screenshot"><img src="https://npmx.dev/api/registry/badge/downloads/@poveste/plugin-screenshot" alt="Downloads"></a> |

## Contributing

See [Contributing Guide](https://github.com/poveste-dev/poveste/blob/main/CONTRIBUTING.md) to learn more about the repository and how you can contribute.

## License

MIT
