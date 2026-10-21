/**
 * What collection inlines for a Nuxt book: the `nuxt` package, its `#` aliases, and
 * what Nuxt generates into `.nuxt`. Each is anchored to a whole path segment: the
 * package pattern matched any directory named `nuxt`, so a book installed under one
 * inlined every dependency it has (#1371). Collection's module ids are POSIX paths
 * on every platform.
 */
export const NUXT_INLINE_DEPS: RegExp[] = [
  /\/node_modules\/(?:nuxt|nuxt3)\//,
  /^#/,
  /\/\.nuxt\//,
]
