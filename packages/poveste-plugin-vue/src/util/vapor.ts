/**
 * An SFC with `vapor` removed from its `<script>` and `<template>` tags, or
 * undefined when it has none. Only the opening tags: the attribute does nothing
 * anywhere else, and a template may well contain the word.
 */
export function withoutVapor(code: string): string | undefined {
  const stripped = code.replace(/<(?:script|template)\b[^>]*>/g, tag => tag.replace(/\svapor(?=[\s/>])/, ''))
  return stripped === code ? undefined : stripped
}
