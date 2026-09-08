<script lang="ts">
import type { PropType } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { defineComponent } from 'vue'

export default defineComponent({
  inheritAttrs: false,

  props: {
    // Declared rather than passed through `$attrs`: with
    // `inheritAttrs: false` the checker cannot see it there, and
    // router-link requires it.
    to: {
      type: [String, Object] as PropType<RouteLocationRaw>,
      required: true,
    },

    exact: {
      type: Boolean,
      default: false,
    },

    matched: {
      type: Boolean,
      default: null,
    },
  },
})
</script>

<template>
  <router-link
    v-slot="{ isActive, isExactActive, href, navigate }"
    :to="to"
    class="poveste-base-overflow-tab"
    v-bind="$attrs"
    custom
  >
    <a
      v-bind="$attrs"
      :href="href"
      class="px-4 h-10 min-w-[150px] inline-flex items-center hover:bg-primary-50 dark:hover:bg-primary-900 relative text-gray-900 dark:text-gray-100"
      :class="{
        'text-primary-700 dark:text-primary-400': matched != null ? matched : (exact && isExactActive) || (!exact && isActive),
      }"
      @click="navigate"
    >
      <slot />

      <transition name="__poveste-scale-y">
        <div
          v-if="matched != null ? matched : (exact && isExactActive) || (!exact && isActive)"
          class="absolute top-0 left-0 h-full w-[2px] bg-primary-500 dark:bg-primary-400"
        />
      </transition>
    </a>
  </router-link>
</template>
