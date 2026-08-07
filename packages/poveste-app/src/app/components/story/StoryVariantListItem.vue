<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { ref, toRefs } from 'vue'
import { useScrollOnActive } from '../../util/scroll'
import { useCurrentVariantRoute } from '../../util/variant'
import BaseListItemLink from '../base/BaseListItemLink.vue'

const props = defineProps({
  variant: {
    type: Object as PropType<Variant>,
    required: true,
  },
})

const { variant } = toRefs(props)
const { isActive, targetRoute } = useCurrentVariantRoute(variant)
const el = ref<HTMLDivElement>()
useScrollOnActive(isActive, el)
</script>

<template>
  <div
    ref="el"
    class="poveste-story-variant-list-item"
    data-test-id="story-variant-list-item"
  >
    <BaseListItemLink
      v-slot="{ active }"
      :to="targetRoute"
      :is-active="isActive"
      class="px-2 py-2 md:py-1.5 m-1 rounded-sm flex items-center gap-2"
    >
      <Icon
        :icon="variant.icon ?? 'carbon:cube'"
        class="w-5 h-5 sm:w-4 sm:h-4 flex-none"
        :class="{
          'text-gray-500': !active && !variant.iconColor,
          'bind-icon-color': !active && variant.iconColor,
        }"
      />
      <span class="truncate">{{ variant.title }}</span>
    </BaseListItemLink>
  </div>
</template>

<style scoped>
.bind-icon-color {
  color: v-bind('variant.iconColor');
}
</style>
