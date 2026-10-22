<script lang="ts">
export default {
  name: 'HstButton',
}
</script>

<script setup lang="ts">
defineProps<{
  color?: 'default' | 'primary' | 'flat'
}>()

/*
 * Plain CSS over the `@theme` tokens, with the variant selected by a data
 * attribute rather than by a map of utility strings in script (#978).
 *
 * The map was not wrong — it read the same bridged tokens `bg-gray-200` reads.
 * It was the second convention in a package of two, and ten more controls are
 * about to be written against whichever one is written down.
 *
 * Each variant sets custom properties and the rules below read them, so a new
 * colour is three declarations in one block instead of a string a reader has to
 * parse utility by utility.
 */
</script>

<template>
  <button
    class="poveste-button"
    data-slot="button"
    :data-color="color ?? 'default'"
  >
    <slot />
  </button>
</template>

<style lang="postcss">
.poveste-button {
  --_poveste-button-surface: var(--_poveste-gray-200);
  --_poveste-button-surface-hover: var(--_poveste-primary-200);
  --_poveste-button-text: var(--_poveste-gray-900);

  border: none;
  border-radius: var(--_poveste-radius-sm);
  background: var(--_poveste-button-surface);
  color: var(--_poveste-button-text);
  cursor: pointer;

  /* Spelled out on the subject: `.ptw-dark` sits above the `@scope` root, so a
     descendant rule keyed on it never matches from in here (#101). */
  &:where(.ptw-dark, .ptw-dark *) {
    --_poveste-button-surface: var(--_poveste-gray-750);
    --_poveste-button-surface-hover: var(--_poveste-primary-900);
    --_poveste-button-text: var(--_poveste-gray-100);
  }

  &:hover {
    background: var(--_poveste-button-surface-hover);
  }

  &[data-color='primary'] {
    --_poveste-button-surface: var(--_poveste-primary-500);
    --_poveste-button-surface-hover: var(--_poveste-primary-600);
    --_poveste-button-text: var(--_poveste-white);

    &:where(.ptw-dark, .ptw-dark *) {
      --_poveste-button-surface: var(--_poveste-primary-500);
      --_poveste-button-surface-hover: var(--_poveste-primary-600);
      --_poveste-button-text: var(--_poveste-black);
    }
  }

  &[data-color='flat'] {
    --_poveste-button-surface: transparent;
    /* What `bg-gray-500/20` compiles to, written out: the utility is a
       `color-mix` against transparent and this is the same declaration. */
    --_poveste-button-surface-hover: color-mix(in oklab, var(--_poveste-gray-500) 20%, transparent);

    &:where(.ptw-dark, .ptw-dark *) {
      --_poveste-button-surface: transparent;
      --_poveste-button-surface-hover: color-mix(in oklab, var(--_poveste-gray-500) 20%, transparent);
    }
  }
}
</style>
