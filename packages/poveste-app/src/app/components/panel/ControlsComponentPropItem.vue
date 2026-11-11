<script lang="ts" setup>
import type { AutoPropComponentDefinition, PropDefinition } from '@poveste/shared'
import type { Variant } from '../../types'
import type { PropControl } from '../../util/prop-controls'
import { Icon } from '@iconify/vue'
import { HstCheckbox, HstColor, HstDate, HstJson, HstNumber, HstSelect, HstSlider, HstText, HstTextarea, HstTooltip } from '@poveste/controls'
import { computed, ref, shallowRef, watch } from 'vue'

const props = defineProps<{
  variant: Variant
  component: AutoPropComponentDefinition
  definition: PropDefinition
  control: PropControl
}>()

const COMPONENTS = {
  text: HstText,
  textarea: HstTextarea,
  number: HstNumber,
  slider: HstSlider,
  checkbox: HstCheckbox,
  select: HstSelect,
  json: HstJson,
  color: HstColor,
  date: HstDate,
}

const model = computed({
  get: () => {
    return props.variant.state._hPropState[props.component.index]?.[props.definition.name]
  },
  set: (value) => {
    if (!props.variant.state._hPropState[props.component.index]) {
      // eslint-disable-next-line vue/no-mutating-props
      props.variant.state._hPropState[props.component.index] = {}
    }
    // eslint-disable-next-line vue/no-mutating-props
    props.variant.state._hPropState[props.component.index][props.definition.name] = value
  },
})

const canReset = computed(() => props.variant.state?._hPropState?.[props.component.index] && props.definition.name in props.variant.state._hPropState[props.component.index])

// Types arrive after the runtime controls show, so a control can change kind. Never
// under the reader: not while it has focus, nor while it holds a value they set (#160).
const focused = ref(false)
const shown = shallowRef(props.control)
function catchUp() {
  if (!focused.value && !canReset.value) {
    shown.value = props.control
  }
}
watch([() => props.control, canReset], catchUp)

const extra = computed(() => {
  const { options, min, max, step } = shown.value
  return {
    ...options ? { options } : {},
    ...min !== undefined ? { min } : {},
    ...max !== undefined ? { max } : {},
    ...step !== undefined ? { step } : {},
  }
})

function reset() {
  if (props.variant.state._hPropState[props.component.index]) {
    // eslint-disable-next-line vue/no-mutating-props
    delete props.variant.state._hPropState[props.component.index][props.definition.name]
  }
}
</script>

<template>
  <!-- The remove action is beside the control, not in its actions slot. Inside
       the control's <label> or checkbox, a label forwarded clicks to it, its
       name joined the control's name, and Space on it toggled the checkbox (#827). -->
  <div
    class="flex items-end hover:bg-primary-100 dark:hover:bg-primary-800"
    :data-control="shown.kind"
    @focusin="focused = true"
    @focusout="focused = false; catchUp()"
  >
    <component
      :is="COMPONENTS[shown.kind]"
      v-model="model"
      v-bind="extra"
      :placeholder="model === undefined ? definition?.default : null"
      class="poveste-controls-component-prop-item grow min-w-0"
      :title="`${definition.name}${canReset ? ' *' : ''}`"
    />
    <HstTooltip content="Remove override">
      <button
        type="button"
        :aria-label="`Remove override of ${definition.name}`"
        :disabled="!canReset"
        class="flex-none flex mr-2 mb-[10px] p-0 bg-transparent border-0 cursor-pointer text-gray-900 dark:text-gray-100 hover:text-primary-500 dark:hover:text-primary-400"
        :class="[
          canReset ? 'opacity-50 hover:opacity-100 focus-visible:opacity-100' : 'opacity-25 pointer-events-none',
        ]"
        @click="reset()"
      >
        <Icon
          icon="carbon:erase"
          class="w-4 h-4"
        />
      </button>
    </HstTooltip>
  </div>
</template>
