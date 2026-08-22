import { writable } from 'svelte/store'

// The Svelte counterpart to the vue3 example's Pinia store: shared state that
// lives in a module rather than in a component, so every story that imports it
// sees the same value. Svelte needs no app-level registration for this, which is
// the difference worth showing — the Vue book wires Pinia up in its setup file.
export const myValue = writable(10)
