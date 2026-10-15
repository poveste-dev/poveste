<template>
  <!-- A link where it navigates, a button everywhere else. An `<a>` without an
       href is not focusable, so a keyboard could not reach the chip (#1351). -->
  <component
    :is="$attrs['href'] ? 'a' : 'button'"
    :type="$attrs['href'] ? undefined : 'button'"
    class="poveste-top-bar-chip-item"
    data-slot="top-bar-chip-item"
  >
    <slot />
  </component>
</template>

<style lang="postcss">
.poveste-top-bar-chip-item {
  display: flex;
  align-items: center;
  gap: .25rem;
  padding: .375rem .625rem;
  border: 0;
  font: inherit;
  color: var(--color-gray-900);
  cursor: pointer;

  @media (prefers-reduced-motion: no-preference) {
    transition: color .15s ease-out, background-color .15s ease-out;
  }

  &:hover {
    background-color: rgb(255 255 255 / .5);
    color: var(--color-primary-500);
  }

  &:active {
    background-color: rgb(255 255 255 / .7);
  }

  /* Inset: the chip clips its items to its rounded border. */
  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: -2px;
  }

  /* Spelled out on the subject: `.ptw-dark` sits above the `@scope` root, so a
     descendant rule keyed on it never matches from in here (#101). */
  &:where(.ptw-dark, .ptw-dark *) {
    color: var(--color-gray-100);

    &:hover {
      background-color: rgb(255 255 255 / .1);
      color: var(--color-primary-400);
    }

    &:active {
      background-color: rgb(255 255 255 / .15);
    }
  }
}
</style>
