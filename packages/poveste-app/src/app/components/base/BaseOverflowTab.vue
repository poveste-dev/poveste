<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  inheritAttrs: false,

  props: {
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
    class="poveste-base-overflow-tab"
    v-bind="$attrs"
    custom
  >
    <a
      v-bind="$attrs"
      :href="href"
      class="ptw-px-4 ptw-h-10 ptw-min-w-[150px] ptw-inline-flex ptw-items-center hover:ptw-bg-primary-50 dark:hover:ptw-bg-primary-900 ptw-relative ptw-text-gray-900 dark:ptw-text-gray-100"
      :class="{
        'ptw-text-primary-500 dark:ptw-text-primary-400': matched != null ? matched : (exact && isExactActive) || (!exact && isActive),
      }"
      @click="navigate"
    >
      <slot />

      <transition name="__poveste-scale-y">
        <div
          v-if="matched != null ? matched : (exact && isExactActive) || (!exact && isActive)"
          class="ptw-absolute ptw-top-0 ptw-left-0 ptw-h-full ptw-w-[2px] ptw-bg-primary-500 dark:ptw-bg-primary-400"
        />
      </transition>
    </a>
  </router-link>
</template>
