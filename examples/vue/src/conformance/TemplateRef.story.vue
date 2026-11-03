<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue'

// A template ref in `<script setup>` looks like any other binding to the state
// sync, which wrote null back over it just after mount, with the element still
// on the page (#1598). The button reads it later, as a story's own code would.
const box = ref<HTMLElement | null>(null)

// Readonly in a dev build, so only a built book's sync ever saw it (#959), and
// under a name of its own, so its key in `refs` doesn't match this binding's.
const named = useTemplateRef<HTMLElement>('other')

function read(event: MouseEvent) {
  (event.currentTarget as HTMLElement).textContent = box.value ? 'held' : 'lost'
}

function readNamed(event: MouseEvent) {
  (event.currentTarget as HTMLElement).textContent = named.value ? 'held' : 'lost'
}
</script>

<template>
  <Story
    id="conformance-template-ref"
    title="Conformance/Template ref"
  >
    <div
      ref="box"
      class="conformance-template-ref-box"
    >
      Box
    </div>
    <button
      class="conformance-template-ref-read"
      @click="read"
    >
      Read
    </button>
    <div ref="other">
      Other
    </div>
    <button
      class="conformance-template-ref-read-named"
      @click="readNamed"
    >
      Read named
    </button>
  </Story>
</template>
