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
      class="px-4 h-full inline-flex items-center hover:bg-primary-50 dark:hover:bg-primary-900 relative text-gray-900 dark:text-gray-100"
      :class="{
        'text-primary-500 dark:text-primary-400': matched != null ? matched : (exact && isExactActive) || (!exact && isActive),
      }"
      @click="navigate"
    >
      <slot />

      <transition name="__poveste-scale-x">
        <div
          v-if="matched != null ? matched : (exact && isExactActive) || (!exact && isActive)"
          class="absolute bottom-0 left-0 w-full h-[2px] bg-primary-500 dark:bg-primary-400"
        />
      </transition>
    </a>
  </router-link>
</template>
