<script lang="ts" setup>
// Titled "Control bindings" rather than "Controls" for the same reason
// `Conformance/Docs` is titled Documentation: a story titled `A/B` makes the
// tree grow a *second* `A` folder when another story is titled exactly `B` at
// the top level, and vue3 has one called Controls. The id is what this suite
// addresses, so the title is free to dodge it.
//
// Titles are deliberately distinct words rather than the control's own name:
// a locator filtering on "Text" would match "Textarea" too, and the resulting
// failure looks like a broken control rather than a broken selector.
const games = {
  'crash-bandicoot': 'Crash Bandicoot',
  'the-last-of-us': 'The Last of Us',
}

function initState() {
  return {
    label: 'Hello',
    enabled: false,
    count: 20,
    notes: 'Longer text...',
    game: 'crash-bandicoot',
    tint: '#000000',
  }
}
</script>

<template>
  <Story
    id="conformance-controls"
    title="Conformance/Control bindings"
    :init-state="initState"
  >
    <template #default="{ state }">
      <pre class="conformance-controls-state">{{ JSON.stringify(state, null, 2) }}</pre>
    </template>

    <template #controls="{ state }">
      <HstText
        v-model="state.label"
        title="Label"
      />
      <HstCheckbox
        v-model="state.enabled"
        title="Enabled"
      />
      <HstNumber
        v-model="state.count"
        title="Count"
      />
      <HstTextarea
        v-model="state.notes"
        title="Notes"
      />
      <HstSelect
        v-model="state.game"
        :options="games"
        title="Game"
      />
      <HstColorSelect
        v-model="state.tint"
        title="Tint"
      />
    </template>
  </Story>
</template>
