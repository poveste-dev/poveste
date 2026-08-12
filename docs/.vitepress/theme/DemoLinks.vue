<script lang="ts" setup>
import type { Framework } from './starters'
import { launchStackBlitz } from './stackblitz'

defineProps<{
  framework: Framework
}>()

// The online-demo buttons (*.examples.poveste.dev) are omitted until those
// subdomains are deployed (tracked in #14). "Try it in a live editor" builds a
// fresh Poveste book in StackBlitz in-memory via the SDK — see ./stackblitz.ts.
</script>

<template>
  <div class="demo-links space-y-2">
    <button
      type="button"
      class="btn-blue flex items-center gap-4 p-4 hover:no-underline w-full text-left"
      @click="launchStackBlitz(framework)"
    >
      <img
        src="/stackblitz.png"
        alt="StackBlitz"
        class="w-8 h-8"
      >
      Try it in a live editor
    </button>
  </div>
</template>
