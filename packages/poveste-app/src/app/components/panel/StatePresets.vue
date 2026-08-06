<script lang="ts" setup>
import type { Story, Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { applyState, clone, omit } from '@poveste/shared'
import { onClickOutside, useStorage, useTimeoutFn } from '@vueuse/core'
import { computed, nextTick, onMounted, ref } from 'vue'
import { toRawDeep } from '../../util/state'
import BaseSelect from '../base/BaseSelect.vue'

const DEFAULT_ID = 'default'

const props = defineProps<{
  story: Story
  variant: Variant
}>()

const saveId = computed(() => `${props.story.id}:${props.variant.id}`)

const omitKeys = ['_hPropDefs']

const defaultState = clone(omit(toRawDeep(props.variant.state), omitKeys))

const selectedOption = useStorage<string>(
  `_poveste-presets/${saveId.value}/selected`,
  DEFAULT_ID,
)

const presetStates = useStorage<Map<string, { state: Record<string, unknown>, label: string }>>(
  `_poveste-presets/${saveId.value}/states`,
  new Map(),
)

const presetsOptions = computed(() => {
  const options = { [DEFAULT_ID]: 'Initial state' }
  presetStates.value.forEach((value, key) => {
    options[key] = value.label
  })
  return options
})

function resetState() {
  selectedOption.value = DEFAULT_ID
  applyState(props.variant.state, clone(defaultState))
}

function applyPreset(id) {
  if (id === DEFAULT_ID) {
    resetState()
  }
  else if (presetStates.value.has(id)) {
    applyState(props.variant.state, clone(toRawDeep(presetStates.value.get(id).state)))
  }
}

onMounted(() => {
  if (selectedOption.value !== DEFAULT_ID) {
    applyPreset(selectedOption.value)
  }
})

const input = ref<HTMLInputElement>()
const select = ref<HTMLInputElement>()
const canEdit = computed(() => selectedOption.value !== DEFAULT_ID)
const isEditing = ref(false)

async function createPreset() {
  const id = (new Date()).getTime().toString()

  presetStates.value.set(id, { state: clone(omit(toRawDeep(props.variant.state), omitKeys)), label: 'New preset' })
  selectedOption.value = id
  isEditing.value = true
  await nextTick()
  input.value.select()
}

const savedNotif = ref(false)
const savedTimeout = useTimeoutFn(() => {
  savedNotif.value = false
}, 1000)

async function savePreset() {
  if (!canEdit.value) return

  const preset = presetStates.value.get(selectedOption.value)
  preset.state = clone(omit(toRawDeep(props.variant.state), omitKeys))
  savedNotif.value = true
  savedTimeout.start()
}

function deletePreset(id) {
  // @TODO custom confirm modal UI
  // eslint-disable-next-line no-alert
  if (!confirm('Are you sure you want to delete this preset?')) {
    return
  }

  if (selectedOption.value === id) {
    resetState()
  }
  presetStates.value.delete(id)
}

async function startEditing() {
  if (!canEdit.value) {
    return
  }

  isEditing.value = true
  await nextTick()
  input.value.select()
}

function stopEditing() {
  isEditing.value = false
}

onClickOutside(select, stopEditing)
</script>

<template>
  <div class="poveste-state-presets ptw-flex ptw-gap-2 ptw-w-full ptw-items-center">
    <div
      ref="select"
      class="ptw-flex-1 ptw-min-w-0"
    >
      <BaseSelect
        v-model="selectedOption"
        :options="presetsOptions"
        @dblclick="startEditing()"
        @keydown.enter="stopEditing()"
        @keydown.escape="stopEditing()"
        @select="id => applyPreset(id)"
      >
        <template #default="{ label }">
          <input
            v-if="isEditing"
            ref="input"
            v-model="presetStates.get(selectedOption).label"
            type="text"
            class="ptw-text-inherit ptw-bg-transparent ptw-w-full ptw-h-full ptw-outline-none"
            @click.stop.prevent
          >

          <div
            v-else
            class="ptw-flex ptw-items-center ptw-gap-2"
          >
            <span class="ptw-flex-1 ptw-truncate">
              {{ label }}
            </span>
            <Icon
              v-if="canEdit"
              v-tooltip="'Rename this preset'"
              icon="carbon:edit"
              class="ptw-flex-none ptw-cursor-pointer ptw-w-4 ptw-h-4 hover:ptw-text-primary-500 ptw-opacity-50 hover:ptw-opacity-100 dark:hover:ptw-text-primary-400 ptw-text-gray-900 dark:ptw-text-gray-100"
              @click.stop="startEditing()"
            />
          </div>
        </template>

        <template #option="{ label, value }">
          <div class="ptw-flex ptw-gap-2 ptw-items-center">
            <span
              class="ptw-flex-1 ptw-truncate"
            >{{ label }}</span>
            <Icon
              v-if="value !== DEFAULT_ID"
              v-tooltip="'Delete this preset'"
              icon="carbon:trash-can"
              class="ptw-flex-none ptw-cursor-pointer ptw-w-4 ptw-h-4 hover:ptw-text-primary-500 ptw-opacity-50 hover:ptw-opacity-100 dark:hover:ptw-text-primary-400 ptw-text-gray-900 dark:ptw-text-gray-100"
              @click.stop="deletePreset(value)"
            />
          </div>
        </template>
      </BaseSelect>
    </div>
    <Icon
      v-tooltip="savedNotif ? 'Saved!' : canEdit ? 'Save to preset' : null"
      :icon="savedNotif ? 'carbon:checkmark' : 'carbon:save'"
      class="ptw-cursor-pointer ptw-w-4 ptw-h-4 hover:ptw-text-primary-500 dark:hover:ptw-text-primary-400 ptw-text-gray-900 dark:ptw-text-gray-100"
      :class="[
        canEdit ? 'ptw-opacity-50 hover:ptw-opacity-100' : 'ptw-opacity-25 ptw-pointer-events-none',
      ]"
      @click="savePreset()"
    />
    <Icon
      v-tooltip="'Create new preset'"
      icon="carbon:add-alt"
      class="ptw-cursor-pointer ptw-w-4 ptw-h-4 hover:ptw-text-primary-500 ptw-opacity-50 hover:ptw-opacity-100 dark:hover:ptw-text-primary-400 ptw-text-gray-900 dark:ptw-text-gray-100"
      @click="createPreset()"
    />
    <Icon
      v-tooltip="'Reset to initial state'"
      icon="carbon:reset"
      class="ptw-cursor-pointer ptw-w-4 ptw-h-4 hover:ptw-text-primary-500 ptw-opacity-50 hover:ptw-opacity-100 dark:hover:ptw-text-primary-400 ptw-text-gray-900 dark:ptw-text-gray-100"
      @click="resetState()"
    />
  </div>
</template>
