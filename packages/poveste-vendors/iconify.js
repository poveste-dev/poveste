// Not `export * from '@iconify/vue'`. Every package that consumes this one aliases that
// bare specifier to this very file, so the re-export resolves to itself and the
// entry comes out empty — `isRef is not a function` at the first call. The npm
// alias in this package's manifest is a name nothing remaps.
export * from 'poveste-iconify-vue'
