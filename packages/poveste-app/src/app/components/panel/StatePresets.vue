<script lang="ts" setup>
import type { Story, Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { applyState, clone } from '@poveste/shared'
import { onClickOutside, useLiveAnnouncer, useStorage, useTimeoutFn } from '@vueuse/core'
import { computed, nextTick, onMounted, ref } from 'vue'
import { toPresetState, toRawDeep } from '../../util/state'
import BaseSelect from '../base/BaseSelect.vue'

const props = defineProps<{
  story: Story
  variant: Variant
}>()

const DEFAULT_ID = 'default'

const saveId = computed(() => `${props.story.id}:${props.variant.id}`)

const omitKeys = ['_hPropDefs']

const defaultState = toPresetState(props.variant.state, omitKeys)

/*
 * `writeDefaults: false`: these are keyed per variant, so writing the default on
 * mount persisted "no presets, default selected" for every variant merely
 * browsed. Nothing prunes them, and a renamed variant orphans its keys forever
 * because no code path can match them again (#326).
 */
const selectedOption = useStorage<string>(
  `_poveste-presets/${saveId.value}/selected`,
  DEFAULT_ID,
  undefined,
  { writeDefaults: false },
)

const presetStates = useStorage<Map<string, { state: Record<string, unknown>, label: string }>>(
  `_poveste-presets/${saveId.value}/states`,
  new Map(),
  undefined,
  { writeDefaults: false },
)

const presetsOptions = computed(() => {
  const options: Record<string, string> = { [DEFAULT_ID]: 'Initial state' }
  presetStates.value.forEach((value, key) => {
    options[key] = value.label
  })
  return options
})

function resetState() {
  selectedOption.value = DEFAULT_ID
  applyState(props.variant.state, clone(defaultState))
}

function applyPreset(id: string) {
  if (id === DEFAULT_ID) {
    resetState()
  }
  else {
    // `has` then `get` is two lookups and only the second one is the value;
    // reading it once says the same thing and carries the type with it.
    const preset = presetStates.value.get(id)
    if (preset) {
      applyState(props.variant.state, clone(toRawDeep(preset.state)))
    }
  }
}

onMounted(() => {
  if (selectedOption.value !== DEFAULT_ID) {
    applyPreset(selectedOption.value)
  }
})

const input = ref<HTMLInputElement>()
const select = ref<HTMLInputElement>()
const picker = ref<InstanceType<typeof BaseSelect>>()
const canEdit = computed(() => selectedOption.value !== DEFAULT_ID)
const isEditing = ref(false)

async function createPreset() {
  const id = Date.now().toString()

  presetStates.value.set(id, { state: toPresetState(props.variant.state, omitKeys), label: 'New preset' })
  selectedOption.value = id
  isEditing.value = true
  await nextTick()
  // The input is rendered by the edit state set above, so it exists by now —
  // unless editing was cancelled during the tick, which unmounts it.
  input.value?.select()
}

// The template bound `v-model` straight to `presetStates.get(selectedOption).label`,
// which is a Map lookup that can miss. Naming it once keeps the template honest
// and gives the miss somewhere to go.
const editingLabel = computed({
  get: () => presetStates.value.get(selectedOption.value)?.label ?? '',
  set: (value) => {
    const preset = presetStates.value.get(selectedOption.value)
    if (preset) preset.label = value
  },
})

const savedNotif = ref(false)
const { polite } = useLiveAnnouncer()
const savedTimeout = useTimeoutFn(() => {
  savedNotif.value = false
}, 1000)

async function savePreset() {
  if (!canEdit.value) return

  const preset = presetStates.value.get(selectedOption.value)
  if (!preset) return
  preset.state = toPresetState(props.variant.state, omitKeys)
  savedNotif.value = true
  savedTimeout.start()
  polite('Preset saved')
}

function deletePreset(id: string) {
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
  // The input is rendered by the edit state set above, so it exists by now —
  // unless editing was cancelled during the tick, which unmounts it.
  input.value?.select()
}

async function stopEditing(refocus = false) {
  if (!isEditing.value) {
    return
  }
  isEditing.value = false
  // Finishing a rename from the keyboard unmounts the field that had focus, so
  // hand it to the picker, which now shows the new name.
  if (refocus) {
    await nextTick()
    picker.value?.focus()
  }
}

onClickOutside(select, () => stopEditing())
</script>

<template>
  <div class="poveste-state-presets flex gap-2 w-full items-center">
    <div
      ref="select"
      class="flex-1 min-w-0"
    >
      <!-- Swapped for the picker rather than put inside it: a text field inside a
           combobox is a control nested in a control (#828). -->
      <input
        v-if="isEditing"
        ref="input"
        v-model="editingLabel"
        type="text"
        aria-label="Preset name"
        class="text-inherit bg-transparent w-full px-2 h-[27px] -my-1 border border-solid border-primary-500 rounded-sm outline-none"
        @keydown.enter="stopEditing(true)"
        @keydown.escape="stopEditing(true)"
      >
      <BaseSelect
        v-else
        ref="picker"
        v-model="selectedOption"
        label="Preset"
        :options="presetsOptions"
        @dblclick="startEditing()"
        @select="id => applyPreset(id)"
      />
    </div>
    <button
      v-tooltip="canEdit ? 'Rename this preset' : null"
      type="button"
      data-testid="preset-rename"
      aria-label="Rename preset"
      :disabled="!canEdit"
      class="flex-none flex p-0 bg-transparent border-0 cursor-pointer text-gray-900 dark:text-gray-100 hover:text-primary-500 dark:hover:text-primary-400"
      :class="[
        canEdit ? 'opacity-50 hover:opacity-100 focus-visible:opacity-100' : 'opacity-25 pointer-events-none',
      ]"
      @click="startEditing()"
    >
      <Icon
        icon="carbon:edit"
        class="w-4 h-4"
      />
    </button>
    <button
      v-tooltip="canEdit ? 'Delete this preset' : null"
      type="button"
      data-testid="preset-delete"
      aria-label="Delete preset"
      :disabled="!canEdit"
      class="flex-none flex p-0 bg-transparent border-0 cursor-pointer text-gray-900 dark:text-gray-100 hover:text-primary-500 dark:hover:text-primary-400"
      :class="[
        canEdit ? 'opacity-50 hover:opacity-100 focus-visible:opacity-100' : 'opacity-25 pointer-events-none',
      ]"
      @click="deletePreset(selectedOption)"
    >
      <Icon
        icon="carbon:trash-can"
        class="w-4 h-4"
      />
    </button>
    <button
      v-tooltip="savedNotif ? 'Saved!' : canEdit ? 'Save to preset' : null"
      type="button"
      data-testid="preset-save"
      aria-label="Save to preset"
      :disabled="!canEdit"
      class="flex-none flex p-0 bg-transparent border-0 cursor-pointer text-gray-900 dark:text-gray-100 hover:text-primary-500 dark:hover:text-primary-400"
      :class="[
        canEdit ? 'opacity-50 hover:opacity-100 focus-visible:opacity-100' : 'opacity-25 pointer-events-none',
      ]"
      @click="savePreset()"
    >
      <Icon
        :icon="savedNotif ? 'carbon:checkmark' : 'carbon:save'"
        class="w-4 h-4"
      />
    </button>
    <button
      v-tooltip="'Create new preset'"
      type="button"
      data-testid="preset-create"
      aria-label="Create new preset"
      class="flex-none flex p-0 bg-transparent border-0 cursor-pointer text-gray-900 dark:text-gray-100 hover:text-primary-500 dark:hover:text-primary-400 opacity-50 hover:opacity-100 focus-visible:opacity-100"
      @click="createPreset()"
    >
      <Icon
        icon="carbon:add-alt"
        class="w-4 h-4"
      />
    </button>
    <button
      v-tooltip="'Reset to initial state'"
      type="button"
      aria-label="Reset to initial state"
      class="flex-none flex p-0 bg-transparent border-0 cursor-pointer text-gray-900 dark:text-gray-100 hover:text-primary-500 dark:hover:text-primary-400 opacity-50 hover:opacity-100 focus-visible:opacity-100"
      @click="resetState()"
    >
      <Icon
        icon="carbon:reset"
        class="w-4 h-4"
      />
    </button>
  </div>
</template>
