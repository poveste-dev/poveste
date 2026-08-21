<script lang="ts">
export default {
  name: 'HstJson',
  inheritAttrs: false,
}
</script>

<script lang="ts" setup>
import type {
  ViewUpdate,
} from '@codemirror/view'
import { defaultKeymap } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language'
import { lintKeymap } from '@codemirror/lint'
import { Compartment } from '@codemirror/state'
import { oneDarkHighlightStyle, oneDarkTheme } from '@codemirror/theme-one-dark'
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
} from '@codemirror/view'
import { Icon } from '@iconify/vue'
import { VTooltip as vTooltip } from 'floating-vue'
import { onMounted, ref, watch, watchEffect } from 'vue'
import { isDark } from '../../utils'
import HstWrapper from '../HstWrapper.vue'
import { stringifyState } from './serialize.js'

const props = defineProps<{
  title?: string
  modelValue: unknown
}>()

const emit = defineEmits({
  'update:modelValue': (newValue: unknown) => true,
})

let editorView: EditorView
// The document this control last rendered from `modelValue`. A change producing
// exactly this is our own render, not an edit, and must not be written back:
// `stringifyState` substitutes markers for what JSON cannot carry, so echoing
// our own document replaces a cycle in the story's state with the string
// `[Circular]`, and a function with `[Function]`.
let renderedDoc: string | undefined
const internalValue = ref('')
const invalidValue = ref(false)
const editorElement = ref<HTMLInputElement>()

const themes = {
  light: [EditorView.baseTheme({}), syntaxHighlighting(defaultHighlightStyle)],
  dark: [oneDarkTheme, syntaxHighlighting(oneDarkHighlightStyle)],
}

const themeConfig = new Compartment()

const extensions = [
  highlightActiveLineGutter(),
  highlightActiveLine(),
  highlightSpecialChars(),
  json(),
  bracketMatching(),
  indentOnInput(),
  foldGutter(),
  keymap.of([
    ...defaultKeymap,
    ...foldKeymap,
    ...lintKeymap,
  ]),
  EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
    internalValue.value = viewUpdate.view.state.doc.toString()
  }),
  themeConfig.of(themes.light),
]

onMounted(() => {
  renderedDoc = stringifyState(props.modelValue, 2)

  editorView = new EditorView({
    doc: renderedDoc,
    extensions,
    parent: editorElement.value,
  })

  watchEffect(() => {
    editorView.dispatch({
      effects: [
        themeConfig.reconfigure(themes[isDark.value ? 'dark' : 'light']),
      ],
    })
  })
})

watch(() => props.modelValue, () => {
  let sameDocument

  try {
    sameDocument = (stringifyState(JSON.parse(internalValue.value)) === stringifyState(props.modelValue))
  }
  catch (e) {
    sameDocument = false
  }

  if (!sameDocument) {
    renderedDoc = stringifyState(props.modelValue, 2)
    editorView.dispatch({ changes: [{ from: 0, to: editorView.state.doc.length, insert: renderedDoc }] })
  }
}, { deep: true })

watch(() => internalValue.value, () => {
  // Our own render coming back round. The model already holds this, and parsing
  // it would hand back the markers instead of the values they stand for.
  if (internalValue.value === renderedDoc) {
    return
  }

  invalidValue.value = false
  try {
    emit('update:modelValue', JSON.parse(internalValue.value))
  }
  catch (e) {
    invalidValue.value = true
  }
})
</script>

<template>
  <HstWrapper
    :title="title"
    class="poveste-json cursor-text"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <div
      ref="editorElement"
      class="__poveste-json-code w-full border border-solid border-black/25 dark:border-white/25 focus-within:border-primary-500 dark:focus-within:border-primary-500 rounded-sm box-border overflow-auto resize-y min-h-32 h-48 relative"
      v-bind="{ ...$attrs, class: null, style: null }"
    />

    <template #actions>
      <Icon
        v-if="invalidValue"
        v-tooltip="'JSON error'"
        icon="carbon:warning-alt"
        class="text-orange-500"
      />

      <slot name="actions" />
    </template>
  </HstWrapper>
</template>

<style scoped>
.__poveste-json-code :deep(.cm-editor) {
  height: 100%;
  min-width: 280px;
}
</style>
