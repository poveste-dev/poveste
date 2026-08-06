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
    class="poveste-base-tab"
    v-bind="$attrs"
    custom
  >
    <a
      v-bind="$attrs"
      :href="href"
      class="ptw-px-4 ptw-h-full ptw-inline-flex ptw-items-center hover:ptw-bg-primary-50 dark:hover:ptw-bg-primary-900 ptw-relative ptw-text-gray-900 dark:ptw-text-gray-100"
      :class="{
        'ptw-text-primary-500 dark:ptw-text-primary-400': matched != null ? matched : (exact && isExactActive) || (!exact && isActive),
      }"
      @click="navigate"
    >
      <slot />

      <transition name="__poveste-scale-x">
        <div
          v-if="matched != null ? matched : (exact && isExactActive) || (!exact && isActive)"
          class="ptw-absolute ptw-bottom-0 ptw-left-0 ptw-w-full ptw-h-[2px] ptw-bg-primary-500 dark:ptw-bg-primary-400"
        />
      </transition>
    </a>
  </router-link>
</template>
