// Not `export * from 'vue'`. Every package that consumes this one aliases that
// bare specifier to this very file, so the re-export resolves to itself and the
// entry comes out empty — `isRef is not a function` at the first call. The npm
// alias in this package's manifest is a name nothing remaps.
//
// **This re-export does not by itself give the chrome the consumer's Vue, and the
// comment that said it did is what #1060 was.** `poveste-vue` is an npm alias, so
// it is a distinct package name and a package manager installs a second physical
// copy whatever the consumer has — a satisfied range does not collapse them, and
// Vite's `resolve.dedupe` cannot, because it matches on the name. Two copies is two
// reactivity systems, and a consumer's `poveste dev` rendered no story at all.
//
// What collapses them is `collapseVendoredVue` in `poveste`, which aliases
// `poveste-vue` to the consumer's `vue` on the consumer path when both are present
// and their majors agree. So the property holds by that alias, not by the shape of
// this file: removing it as redundant to this comment reopens #1060. See the README.
export * from 'poveste-vue'
