<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'

const props = defineProps({
  icon: {
    type: String,
    default: 'carbon:cube',
  },
  title: {
    type: String,
    default: '',
  },
  count: {
    type: Number,
    default: 0,
  },
})

// Starts at 0 so the transition has a value to animate from.
const displayCount = ref(0)
const valueEl = useTemplateRef<HTMLElement>('valueEl')

onMounted(async () => {
  await nextTick()
  // Forced read, not rAF: rAF never fires in a background tab, leaving the
  // count at 0. This resolves the starting value whether or not we're visible.
  void valueEl.value?.offsetWidth
  displayCount.value = props.count
})

watch(() => props.count, (value) => {
  displayCount.value = value
})
</script>

<template>
  <div class="poveste-home-counter p-2 flex items-center gap-x-2">
    <Icon
      :icon="props.icon"
      class="text-2xl text-gray-700 dark:text-gray-300 flex-none"
    />
    <!-- `order` keeps the number on top without putting `dd` before its `dt`. -->
    <dl class="flex flex-col leading-none m-0">
      <dt class="order-2 text-sm text-gray-900 dark:text-gray-100">
        {{ title }}
      </dt>
      <!-- Generated content, so hidden from AT; the real value follows. -->
      <dd
        ref="valueEl"
        class="poveste-home-counter-value order-1 ms-0 text-primary-500 min-w-[80px] font-bold"
        :style="{ '--poveste-count': displayCount }"
        aria-hidden="true"
      />
      <dd class="sr-only ms-0">
        {{ count }}
      </dd>
    </dl>
  </div>
</template>

<style scoped>
/* Outside the layer — registration is document-global, not cascaded. */
@property --poveste-count {
  syntax: '<integer>';
  initial-value: 0;
  inherits: false;
}

/* Layered so a `transition-none` utility can still win — see #104. */
@layer components {
  .poveste-home-counter-value {
    counter-reset: poveste-count var(--poveste-count, 0);

    &::after {
      content: counter(poveste-count);
    }

    /* Opt in, so an engine without the query animates nothing. */
    @media (prefers-reduced-motion: no-preference) {
      transition: --poveste-count 700ms ease-out 100ms;
    }
  }
}
</style>
