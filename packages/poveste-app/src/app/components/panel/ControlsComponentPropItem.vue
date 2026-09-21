<script lang="ts" setup>
import type { AutoPropComponentDefinition, PropDefinition } from '@poveste/shared'
import type { Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { HstCheckbox, HstJson, HstNumber, HstText, HstTooltip } from '@poveste/controls'
import { computed } from 'vue'

const props = defineProps<{
  variant: Variant
  component: AutoPropComponentDefinition
  definition: PropDefinition
}>()

const comp = computed(() => {
  switch (props.definition.types?.[0]) {
    case 'string':
      return HstText
    case 'number':
      return HstNumber
    case 'boolean':
      return HstCheckbox
    case 'object':
    default:
      return HstJson
  }
})

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

function reset() {
  if (props.variant.state._hPropState[props.component.index]) {
    // eslint-disable-next-line vue/no-mutating-props
    delete props.variant.state._hPropState[props.component.index][props.definition.name]
  }
}

const canReset = computed(() => props.variant.state?._hPropState?.[props.component.index] && props.definition.name in props.variant.state._hPropState[props.component.index])
</script>

<template>
  <!-- The remove action is beside the control, not in its actions slot. Inside
       the control's <label> or checkbox, a label forwarded clicks to it, its
       name joined the control's name, and Space on it toggled the checkbox (#827). -->
  <div
    v-if="comp"
    class="flex items-end hover:bg-primary-100 dark:hover:bg-primary-800"
  >
    <component
      :is="comp"
      v-model="model"
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
