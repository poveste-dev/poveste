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
      :aria-current="(isActive != null ? isActive : linkIsActive) ? 'page' : undefined"
      class="flex items-center gap-2 text-gray-900 dark:text-gray-100"
      :class="[
        $attrs.class,
        (isActive != null ? isActive : linkIsActive)
          ? 'active bg-primary-500 hover:bg-primary-600 text-white dark:text-black'
          : 'hover:bg-primary-100 dark:hover:bg-primary-900',
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
