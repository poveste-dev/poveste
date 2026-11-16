<script lang="ts">
import type { HostedControlElement } from './internals.js'
import { defineComponent, h, mergeProps, toHandlerKey, useHost } from 'vue'
import { INTERNALS } from './internals.js'

/**
 * The component every control element mounts: the control, given what the element
 * was handed. Declares no props, so nothing is reflected to an attribute — a
 * reflected `title` would put the browser's own tooltip over the whole control.
 */
export default defineComponent({
  name: 'ControlHost',
  inheritAttrs: false,
  setup(_props, { emit }) {
    const internals = (useHost() as unknown as HostedControlElement)[INTERNALS]
    // An element's `emit` dispatches a `CustomEvent` on it, so each event the control
    // emits reaches a listener on the element as well as one passed in `props`.
    const listeners = Object.fromEntries(internals.emits.map(event => [
      toHandlerKey(event),
      (...args: unknown[]) => emit(event, ...args),
    ]))

    return () => {
      if (!internals.ready.value) {
        return null
      }
      const slots = Object.fromEntries(internals.slotNames.value.map(name => [
        name,
        (props: Record<string, unknown> = {}) => internals.slotOutlet(name, props),
      ]))
      return h(internals.control, mergeProps(internals.props, listeners), slots)
    }
  },
})
</script>

<style>
/* The element only marks where a control mounts. Its own root lays out as it does
   in the app's panel, which renders the same components with no element around them. */
:where(
  poveste-hst-button,
  poveste-hst-button-group,
  poveste-hst-checkbox,
  poveste-hst-checkbox-list,
  poveste-hst-text,
  poveste-hst-number,
  poveste-hst-slider,
  poveste-hst-textarea,
  poveste-hst-select,
  poveste-hst-radio,
  poveste-hst-color,
  poveste-hst-date,
  poveste-hst-json,
  poveste-hst-color-shades,
  poveste-hst-token-list,
  poveste-hst-token-grid,
  poveste-hst-copy-icon,
  poveste-hst-color-select
) {
  display: contents;
}
</style>
