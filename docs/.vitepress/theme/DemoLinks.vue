<script lang="ts" setup>
import type { Framework } from './starters'
import { launchStackBlitz } from './stackblitz'
import { names } from './starters'

defineProps<{
  framework: Framework
  /** What the starter shows and does not, where the framework's support is partial. */
  note?: string
}>()

// The online-demo buttons (*.examples.poveste.dev) are omitted until those
// subdomains are deployed (tracked in #14). "Try <framework> in a live editor"
// builds a fresh Poveste book in StackBlitz in-memory via the SDK — see
// ./stackblitz.ts.
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
        alt=""
        class="w-8 h-8"
      >
      Try {{ names[framework] }} in a live editor
    </button>
    <p
      v-if="note"
      class="text-sm opacity-80 m-0"
    >
      {{ note }}
    </p>
  </div>
</template>
