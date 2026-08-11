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

/*
 * The count-up is a CSS transition on a registered custom property, so the
 * browser interpolates it and the only JS involved is one style write per
 * change. The original (histoire #613, removed upstream in a6a9b81) drove it
 * with `useTransition`, which ticks a reactive ref on every frame: ~42 renders
 * per counter per animation, each patching a text node whose digits change
 * width. Same effect, without asking Vue to re-render 40 times a second.
 *
 * Rendering starts at 0 and the real value lands after mount, because a
 * transition needs a previous computed value to animate from — on first style
 * resolution there is none, so a counter that mounts at its final value would
 * simply appear.
 */
const displayCount = ref(0)
const valueEl = useTemplateRef<HTMLElement>('valueEl')

onMounted(async () => {
  await nextTick()
  /*
   * Force the starting value to be resolved before changing it, so the browser
   * has something to transition from instead of collapsing 0 and the real count
   * into one style computation.
   *
   * Deliberately not `requestAnimationFrame`: it does not run in a background
   * tab, so a book opened in one would sit at 0 until the count next changed.
   * A forced style read works whether or not the page is visible.
   */
  void valueEl.value?.offsetWidth
  displayCount.value = props.count
})

// Stories stream in during dev, so the count keeps moving after mount. Each
// change animates from wherever the last one got to, rather than restarting.
watch(() => props.count, (value) => {
  displayCount.value = value
})
</script>

<template>
  <div class="poveste-home-counter p-2 flex items-center gap-x-2">
    <!-- @iconify/vue already marks its output aria-hidden. -->
    <Icon
      :icon="props.icon"
      class="text-2xl text-gray-700 dark:text-gray-300 flex-none"
    />
    <!--
      A label and its value: `dl` associates the two, so this announces as
      "Stories, 36" instead of the bare "36" and "Stories" that adjacent spans
      produced. `order` keeps the number above the label without putting `dd`
      before its `dt` in the DOM, which would break the association.
    -->
    <dl class="flex flex-col leading-none m-0">
      <dt class="order-2 text-sm text-gray-900 dark:text-gray-100">
        {{ title }}
      </dt>
      <!--
        The animated number is generated content — not selectable, and announced
        inconsistently — so it is hidden and the real value exposed beside it.
      -->
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
/*
 * `@property` has to stay outside the layer: registration is document-global and
 * unaffected by the cascade, and it still registers correctly even though the
 * app stylesheet wraps everything in `@scope`.
 */
@property --poveste-count {
  syntax: '<integer>';
  initial-value: 0;
  inherits: false;
}

/*
 * Layered so Tailwind's `@layer utilities` can still win. An unlayered rule
 * beats every layered one regardless of specificity, so leaving `transition`
 * unlayered here would quietly defeat a `transition-none` utility on this
 * element — the same inversion that broke every border in #104.
 */
@layer components {
  .poveste-home-counter-value {
    /* The fallback keeps the number correct if `@property` never registers. */
    counter-reset: poveste-count var(--poveste-count, 0);

    &::after {
      content: counter(poveste-count);
    }

    /*
     * Opt in to motion rather than opting out of it: a number counting itself
     * up is exactly what this preference is for, and phrasing it this way
     * means an engine that does not understand the query renders no animation
     * instead of an unwanted one. The original had no guard at all.
     */
    @media (prefers-reduced-motion: no-preference) {
      transition: --poveste-count 700ms ease-out 100ms;
    }
  }
}
</style>
