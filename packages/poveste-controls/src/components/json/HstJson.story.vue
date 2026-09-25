<script lang="ts" setup>
import HstJson from './HstJson.vue'

function initState() {
  return {
    film: {
      year: 2017,
      title: 'Blade Runner 2049',
      actors: ['Ryan Gosling', 'Harrison Ford', 'Ana de Armas', 'Sylvia Hoeks'],
    },
  }
}

// A `Date` writes out as a quoted ISO string and a `Map` as `{}`, so a document
// holding one is a view of the value rather than the value. The editor names
// them and refuses the write-back that would replace each with its label.
function namedState() {
  return {
    film: {
      released: new Date(1509321600000),
      cast: new Map([['K', 'Ryan Gosling'], ['Deckard', 'Harrison Ford']]),
      rating: /^\d(\.\d)?$/,
      onPick: () => {},
    },
  }
}
</script>

<template>
  <Story
    title="HstJson"
    group="controls"
    :layout="{ type: 'single', iframe: false }"
  >
    <Variant
      title="default"
      :init-state="initState"
    >
      <template #default="{ state }">
        <HstJson
          v-model="state.film"
          title="Textarea"
        />
        <pre>{{ state.film }}</pre>
      </template>

      <template #controls="{ state }">
        <HstJson
          v-model="state.film"
          title="Text"
        />
      </template>
    </Variant>

    <Variant
      title="values JSON cannot carry"
      :init-state="namedState"
    >
      <template #default="{ state }">
        <HstJson
          v-model="state.film"
          title="Named"
        />
      </template>
    </Variant>
  </Story>
</template>
