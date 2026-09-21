// Not `export * from 'vue'`. Every package that consumes this one aliases that
// bare specifier to this very file, so the re-export resolves to itself and the
// entry comes out empty — `isRef is not a function` at the first call. The npm
// alias in this package's manifest is a name nothing remaps.
//
// This resolves to the *consumer's* Vue whenever theirs satisfies our range, and to a
// nested copy only when it does not. The chrome running Poveste's own Vue is therefore
// version-dependent rather than structural. See the README.
export * from 'poveste-vue'
