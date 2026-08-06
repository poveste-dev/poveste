<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  inheritAttrs: false,

  props: {
    isActive: {
      type: Boolean,
      default: undefined,
    },
  },

  emits: {
    navigate: () => true,
  },

  setup(props, { emit }) {
    function handleNavigate(event, navigate: (event) => unknown) {
      emit('navigate')
      navigate(event)
    }

    return {
      handleNavigate,
    }
  },
})
</script>

<template>
  <RouterLink
    v-slot="{ isActive: linkIsActive, href, navigate }"
    class="poveste-base-list-item-link"
    v-bind="$attrs"
    custom
  >
    <a
      :href="href"
      class="ptw-flex ptw-items-center ptw-gap-2 ptw-text-gray-900 dark:ptw-text-gray-100"
      :class="[
        $attrs.class,
        (isActive != null ? isActive : linkIsActive)
          ? 'active ptw-bg-primary-500 hover:ptw-bg-primary-600 ptw-text-white dark:ptw-text-black'
          : 'hover:ptw-bg-primary-100 dark:hover:ptw-bg-primary-900',
      ]"
      @click="handleNavigate($event, navigate)"
      @keyup.enter="handleNavigate($event, navigate)"
      @keyup.space="handleNavigate($event, navigate)"
    >
      <slot
        :active="isActive != null ? isActive : linkIsActive"
      />
    </a>
  </RouterLink>
</template>
