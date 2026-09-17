<script lang="ts" setup>
import type { AutoPropComponentDefinition, PropDefinition } from '@poveste/shared'
import type { Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { HstCheckbox, HstJson, HstNumber, HstText } from '@poveste/controls'
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
  <component
    :is="comp"
    v-if="comp"
    v-model="model"
    :placeholder="model === undefined ? definition?.default : null"
    class="poveste-controls-component-prop-item"
    :title="`${definition.name}${canReset ? ' *' : ''}`"
  >
    <template #actions>
      <button
        v-tooltip="'Remove override'"
        type="button"
        :aria-label="`Remove override of ${definition.name}`"
        :disabled="!canReset"
        class="flex-none flex p-0 bg-transparent border-0 cursor-pointer text-gray-900 dark:text-gray-100 hover:text-primary-500 dark:hover:text-primary-400"
        :class="[
          canReset ? 'opacity-50 hover:opacity-100 focus-visible:opacity-100' : 'opacity-25 pointer-events-none',
        ]"
        @click.stop="reset()"
      >
        <Icon
          icon="carbon:erase"
          class="w-4 h-4"
        />
      </button>
    </template>
  </component>
</template>
