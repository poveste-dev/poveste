<script lang="ts">
export default {
  name: 'HstWrapper',
}
</script>

<script lang="ts" setup>
import HstTooltip from './HstTooltip.vue'

withDefaults(defineProps<{
  title?: string | undefined
  tag?: string | undefined
}>(), {
  title: undefined,
  tag: 'label',
})
</script>

<template>
  <component
    :is="tag"
    class="poveste-wrapper histoire-wrapper"
    data-slot="wrapper"
  >
    <HstTooltip
      :content="title"
      side="left"
      :offset="12"
    >
      <span
        class="poveste-wrapper-title"
        data-slot="title"
      >
        {{ title }}
      </span>
    </HstTooltip>
    <span class="poveste-wrapper-body">
      <span
        class="poveste-wrapper-control"
        data-slot="field"
      >
        <slot />
      </span>
      <slot name="actions" />
    </span>
  </component>
</template>

<!-- The controls' own tokens, here rather than imported by `index.ts`, where the import
     would ship in `index.d.ts` naming a file `dist` does not have. The build puts every
     control's CSS in one `index.es.css`, so they load with any of them (#1443). -->
<style src="../style/private-tokens.css"></style>

<style lang="postcss">
.poveste-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  padding: .5rem;

  &:hover {
    background-color: var(--_poveste-primary-100);
  }

  &:where(.ptw-dark, .ptw-dark *):hover {
    background-color: var(--_poveste-primary-800);
  }
}

.poveste-wrapper-title {
  width: 7rem;
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.poveste-wrapper-body {
  display: flex;
  flex-grow: 1;
  align-items: center;
  gap: .25rem;
  max-width: 100%;
}

.poveste-wrapper-control {
  display: block;
  flex-grow: 1;
  max-width: 100%;
}
</style>
