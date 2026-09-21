<script lang="ts">
export default {
  name: 'HstTooltip',
}
</script>

<script lang="ts" setup>
import { TooltipArrow, TooltipContent, TooltipPortal, TooltipProvider, TooltipRoot, TooltipTrigger } from 'reka-ui'
import { computed, onMounted, shallowRef, useSlots } from 'vue'
import { portalTarget } from '../portal-target'

const props = withDefaults(defineProps<{
  /**
   * Nothing renders without one, which is how the truncation tooltips opt out.
   * `null` counts as nothing, since that is what a `x ? 'Label' : null` reads as.
   */
  content?: string | null | undefined
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Gap from the trigger — floating-vue's `distance`. */
  offset?: number
  /** Held open by the caller, which is what `triggers: []` with `shown` did. */
  open?: boolean | undefined
}>(), {
  content: undefined,
  side: 'top',
  offset: 5,
  open: undefined,
})

const slots = useSlots()

// A `content` slot for the few tooltips that are more than a line of text — the
// chrome's keyboard shortcuts render a styled key beside their description, and
// that used to be an HTML string handed to `v-html`.
const hasContent = computed(() => Boolean(props.content) || Boolean(slots['content']))

// The timings are floating-vue's tooltip theme, not Reka's: 700ms to open and
// 300ms of grouping between neighbours would be a visible change of behaviour
// in eight places at once.
const DELAY_MS = 200
const NO_GROUPING = 0

// Passed through only when the caller set it: under `exactOptionalPropertyTypes`
// an explicit `undefined` is not the same as an absent prop, and absent is what
// leaves the tooltip uncontrolled.
const rootBinding = computed(() => (props.open === undefined ? {} : { open: props.open }))

const target = shallowRef<HTMLElement>()
onMounted(() => {
  target.value = portalTarget()
})
</script>

<template>
  <TooltipProvider
    :delay-duration="DELAY_MS"
    :skip-delay-duration="NO_GROUPING"
  >
    <TooltipRoot v-bind="rootBinding">
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal
        v-if="hasContent && target"
        :to="target"
      >
        <TooltipContent
          class="poveste-tooltip"
          :side="side"
          :side-offset="offset"
        >
          <slot name="content">
            {{ content }}
          </slot>
          <TooltipArrow
            class="poveste-tooltip-arrow"
            :width="10"
            :height="5"
          />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>

<style lang="postcss">
/* floating-vue's stock tooltip theme, which is what these eight sites looked
   like and what the app never overrode. */
.poveste-tooltip {
  background: rgb(0 0 0 / .8);
  color: #fff;
  border-radius: 6px;
  padding: 7px 12px 6px;
  line-height: normal;
  z-index: 100;
}

.poveste-tooltip-arrow {
  fill: rgb(0 0 0 / .8);
}
</style>
