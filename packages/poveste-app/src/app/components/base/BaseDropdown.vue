<script lang="ts" setup>
import { HstTooltip, PopoverAnchor, PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger, portalTarget } from '@poveste/controls'
import { onMounted, ref, shallowRef } from 'vue'

// The wrapper below is what a caller's class and `data-testid` are for, the way
// they were on `VDropdown` itself.
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  /** floating-vue's `skidding`: a shift along the trigger's own edge. */
  alignOffset?: number
  /**
   * Refuses to open, rather than disabling the button. A disabled button takes
   * no pointer events, and the one site that sets this still wants its tooltip.
   */
  disabled?: boolean
  /**
   * Rendered here rather than around the trigger at the call site, because
   * where the tooltip sits relative to the anchor below decides whether this
   * opens in the right place at all.
   */
  tooltip?: string | null | undefined
}>(), {
  side: 'bottom',
  align: 'center',
  alignOffset: 0,
  disabled: false,
  tooltip: undefined,
})

const open = ref(false)

function setOpen(value: boolean) {
  open.value = value && !props.disabled
}

// After mount, not during setup: the chrome's root is only in the document once
// the tree it wraps has been inserted.
const target = shallowRef<HTMLElement>()
onMounted(() => {
  target.value = portalTarget()
})
</script>

<template>
  <PopoverRoot
    :open="open"
    @update:open="setOpen"
  >
    <!-- The anchor is the wrapper, not the trigger, and it has to sit outside
    the tooltip. A tooltip is a popper too, so a trigger rendered inside one
    registers itself as *its* anchor, and the panel then has none: it opens at
    the top-left corner, off-screen, which a test asking only whether it is
    visible still passes. -->
    <PopoverAnchor as-child>
      <div
        v-bind="$attrs"
        class="poveste-dropdown-trigger"
      >
        <!-- No tooltip while the panel is up: it would sit on top of the first
        row. -->
        <HstTooltip :content="open ? null : tooltip">
          <PopoverTrigger as-child>
            <slot :open="open" />
          </PopoverTrigger>
        </HstTooltip>
      </div>
    </PopoverAnchor>

    <PopoverPortal
      v-if="target"
      :to="target"
    >
      <PopoverContent
        class="poveste-dropdown"
        :side="side"
        :align="align"
        :side-offset="8"
        :align-offset="alignOffset"
        :collision-padding="4"
      >
        <slot
          name="popper"
          :close="() => setOpen(false)"
        />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style lang="pcss">
/* floating-vue put the same zero on its own wrapper, and the triggers that
   wanted text to sit normally say `leading-normal` because of it. */
.poveste-dropdown-trigger {
  line-height: 0;
}

.poveste-dropdown {
  background: #fff;
  color: #000;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 6px 30px rgb(0 0 0 / .1);
  /* A row that paints to the panel's edge has to stop at the rounded corner,
     which the `overflow-y: auto` on floating-vue's inner element did. */
  overflow: hidden;
  z-index: 100;

  /*
   * What Tailwind's `dark:` compiles to, spelled out because `@apply` in a
   * single-file component needs a `@reference` and no component here has one.
   * Not `.ptw-dark &`: the chrome CSS is wrapped in `@scope` and `.ptw-dark`
   * sits on `<html>`, above the scope root, so a descendant rule keyed on it
   * never matches and the panel falls back to the light colours (#101). This
   * puts the condition on the subject instead, and adds no specificity — so it
   * has to come after the light values to win.
   */
  &:where(.ptw-dark, .ptw-dark *) {
    background: var(--color-gray-700);
    border-color: var(--color-gray-850);
    color: var(--color-gray-100);
  }

  &:focus-visible {
    outline: none;
  }

  &[data-state='open'] {
    transform-origin: var(--reka-popover-content-transform-origin);
    animation: poveste-dropdown-open .15s cubic-bezier(0, 1, .5, 1);
  }
}

@keyframes poveste-dropdown-open {
  from {
    opacity: 0;
    transform: scale(.75);
  }
}
</style>
