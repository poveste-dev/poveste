<script setup lang="ts">
</script>

<template>
  <div>
    <div class="my-button">
      Should have a blue border (cascade layer test)
    </div>

    <div class="user-card" style="margin-top: 16px;">
      <h3>User card</h3>
      <p>Background should be lime, border tomato dashed.</p>
      <p>Inherits <code>--user-primary</code> from <code>:root → :scope</code>.</p>
      <p>
        <a href="#">A wavy-underline tomato link</a>
      </p>
    </div>

    <p style="margin-top: 16px;">
      The wider page background should NOT be tomato — that rule
      is scoped to story containers only.
    </p>

    <!-- Consumer-side Tailwind v4 utilities: these must work inside the story. -->
    <div
      data-testid="consumer-tailwind"
      class="mt-4 bg-red-500 p-4 text-white"
    >
      Consumer Tailwind utilities should apply here.
    </div>

    <!-- A chrome-only utility. poveste styles its own UI with this class, and
         it must NOT leak in here, so this box stays unstyled. -->
    <div
      data-testid="chrome-utility-leak"
      class="bg-primary-500"
    >
      This must NOT pick up poveste's chrome styling.
    </div>
  </div>
</template>

<style scoped>
@layer components {
    .my-button {
        border: 1px solid blue;
        background-color: transparent;
        color: blue;
    }
}
</style>
