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

    isActive: {
      type: Boolean,
      default: undefined,
    },
  },

  emits: {
    navigate: () => true,
  },

  setup(props, { emit }) {
    function handleNavigate(event: MouseEvent | KeyboardEvent, navigate: (event?: MouseEvent) => unknown) {
      emit('navigate')
      // vue-router types this as a click, but its guard reads only the modifier
      // keys and `defaultPrevented`, which a key press carries too.
      navigate(event as MouseEvent)
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
    :to="to"
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
          ? 'active bg-primary-700 hover:bg-primary-800 dark:bg-primary-500 dark:hover:bg-primary-600 text-white dark:text-black'
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
