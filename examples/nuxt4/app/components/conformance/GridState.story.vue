<script lang="ts" setup>
// Every variant carries its own `init-state` and renders from it. A cell
// handed this variant by a retarget (#240) has to run that setup — the realm
// only ever mounted the variant it booted for — or the label is empty.
//
// Keys are per variant: a key shared across variants is shared state, by way
// of the story's implicit state, so a common `label` would read the same in
// every cell. A hundred, so the window scrolls past its first fill.
const count = 100
</script>

<template>
  <Story
    id="conformance-grid-state"
    title="Conformance/Grid state"
    :layout="{ type: 'grid', width: 200 }"
  >
    <Variant
      v-for="n in count"
      :id="`v${n}`"
      :key="n"
      :title="`Variant ${n}`"
      :init-state="() => ({ [`label${n}`]: `Variant ${n}` })"
    >
      <template #default="{ state }">
        <span
          class="conformance-grid-state-label"
          style="display: block; height: 48px"
        >{{ state[`label${n}`] }}</span>
      </template>
    </Variant>
  </Story>
</template>
