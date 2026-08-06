<script lang="ts" setup>
import type { Highlighter } from 'shiki'
import type { Story, Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { HstCopyIcon } from '@poveste/controls'
import { unindent } from '@poveste/shared'
import { createHighlighter } from 'shiki'
import { clientSupportPlugins } from 'virtual:$poveste-support-plugins-client'
import { computed, markRaw, nextTick, onMounted, ref, shallowRef, watch, watchEffect } from 'vue'
import { isDark } from '../../util/dark'
import BaseEmpty from '../base/BaseEmpty.vue'

const props = defineProps<{
  story: Story
  variant: Variant
}>()

const generateSourceCodeFn = ref(null)

watchEffect(async () => {
  const clientPlugin = clientSupportPlugins[props.story.file?.supportPluginId]
  if (clientPlugin) {
    const pluginModule = await clientPlugin()
    generateSourceCodeFn.value = markRaw(pluginModule.generateSourceCode)
  }
})

const highlighter = shallowRef<Highlighter>()

const dynamicSourceCode = ref('')
const error = ref<string>(null)

watch(() => [props.variant, generateSourceCodeFn.value], async () => {
  if (!generateSourceCodeFn.value) return
  error.value = null
  dynamicSourceCode.value = ''
  try {
    if (props.variant.source) {
      dynamicSourceCode.value = props.variant.source
    }
    else if (props.variant.slots?.().source) {
      const source = props.variant.slots?.().source()[0].children
      if (source) {
        dynamicSourceCode.value = await unindent(source)
      }
    }
    else {
      dynamicSourceCode.value = await generateSourceCodeFn.value(props.variant)
    }
  }
  catch (e) {
    console.error(e)
    error.value = e.message
  }

  // Auto-switch
  if (!dynamicSourceCode.value) {
    displayedSource.value = 'static'
  }
}, {
  deep: true,
  immediate: true,
})

// Static file source

const staticSourceCode = ref('')
watch(() => [props.story, props.story?.file?.source], async () => {
  staticSourceCode.value = ''
  const sourceLoader = props.story.file?.source
  if (sourceLoader) {
    staticSourceCode.value = (await sourceLoader()).default
  }
}, {
  immediate: true,
})

const displayedSource = ref<'dynamic' | 'static'>('dynamic')

const displayedSourceCode = computed(() => {
  if (displayedSource.value === 'dynamic') {
    return dynamicSourceCode.value
  }
  return staticSourceCode.value
})

// HTML render

onMounted(async () => {
  highlighter.value = await createHighlighter({
    langs: [
      'html',
      'jsx',
    ],
    themes: [
      'github-light',
      'github-dark',
    ],
  })
})

const sourceHtml = computed(() => displayedSourceCode.value
  ? highlighter.value?.codeToHtml(displayedSourceCode.value, {
    lang: 'html',
    theme: isDark.value ? 'github-dark' : 'github-light',
  })
  : '')

// Scrolling

let lastScroll = 0

// Reset
watch(() => props.variant, () => {
  lastScroll = 0
})

const scroller = ref<HTMLElement>()

function onScroll(event) {
  if (sourceHtml.value) {
    lastScroll = event.target.scrollTop
  }
}

watch(sourceHtml, async () => {
  await nextTick()
  if (scroller.value) {
    scroller.value.scrollTop = lastScroll
  }
})
</script>

<template>
  <div
    class="poveste-story-source-code ptw-bg-gray-50 dark:ptw-bg-gray-750 ptw-h-full ptw-overflow-hidden ptw-flex ptw-flex-col"
  >
    <!-- Toolbar -->
    <div
      v-if="!error"
      class="ptw-h-10 ptw-flex-none ptw-border-b ptw-border-solid ptw-border-gray-500/5 ptw-px-4 ptw-flex ptw-items-center ptw-gap-2"
    >
      <div class="ptw-text-gray-900 dark:ptw-text-gray-100">
        Source
      </div>
      <div class="ptw-flex-1" />

      <!-- Display source modes -->
      <div class="ptw-flex ptw-flex-none ptw-gap-px ptw-h-full ptw-py-2">
        <button
          v-tooltip="!dynamicSourceCode ? 'Dynamic source code is not available' : displayedSource !== 'dynamic' ? 'Switch to dynamic source' : null"
          class="ptw-flex ptw-items-center ptw-gap-1 ptw-h-full ptw-px-1 ptw-bg-gray-500/10 ptw-rounded-l ptw-transition-all ptw-ease-[cubic-bezier(0,1,.6,1)] ptw-duration-300 ptw-overflow-hidden"
          :class="[
            displayedSource !== 'dynamic' ? 'ptw-max-w-6 ptw-opacity-70' : 'ptw-max-w-[82px] ptw-text-primary-600 dark:ptw-text-primary-400',
            dynamicSourceCode ? 'ptw-cursor-pointer hover:ptw-bg-gray-500/30 active:ptw-bg-gray-600/50' : 'ptw-opacity-50',
          ]"
          @click="dynamicSourceCode && (displayedSource = 'dynamic')"
        >
          <Icon
            icon="carbon:flash"
            class="ptw-w-4 ptw-h-4 ptw-flex-none"
          />
          <span
            class="transition-opacity duration-300"
            :class="{
              'opacity-0': displayedSource !== 'dynamic',
            }"
          >
            Dynamic
          </span>
        </button>
        <button
          v-tooltip="!staticSourceCode ? 'Static source code is not available' : displayedSource !== 'static' ? 'Switch to static source' : null"
          class="ptw-flex ptw-items-center ptw-gap-1 ptw-h-full ptw-px-1 ptw-bg-gray-500/10 ptw-rounded-r ptw-transition-all ptw-ease-[cubic-bezier(0,1,.6,1)] ptw-duration-300 ptw-overflow-hidden"
          :class="[
            displayedSource !== 'static' ? 'ptw-max-w-6 ptw-opacity-70' : 'ptw-max-w-[63px] ptw-text-primary-600 dark:ptw-text-primary-400',
            staticSourceCode ? 'ptw-cursor-pointer hover:ptw-bg-gray-500/30 active:ptw-bg-gray-600/50' : 'ptw-opacity-50',
          ]"
          @click="staticSourceCode && (displayedSource = 'static')"
        >
          <Icon
            icon="carbon:document"
            class="ptw-w-4 ptw-h-4 ptw-flex-none"
          />
          <span
            class="transition-opacity duration-300"
            :class="{
              'opacity-0': displayedSource !== 'static',
            }"
          >
            Static
          </span>
        </button>
      </div>

      <HstCopyIcon
        :content="displayedSourceCode"
        class="ptw-flex-none"
      />
    </div>

    <div
      v-if="error"
      class="ptw-text-red-500 ptw-h-full ptw-p-2 ptw-overflow-auto ptw-font-mono ptw-text-sm"
    >
      Error: {{ error }}
    </div>

    <BaseEmpty v-else-if="!displayedSourceCode">
      <Icon
        icon="carbon:code-hide"
        class="ptw-w-8 ptw-h-8 ptw-opacity-50 ptw-mb-6"
      />
      <span>Not available</span>
    </BaseEmpty>

    <textarea
      v-else-if="!sourceHtml"
      ref="scroller"
      class="__poveste-code-placeholder ptw-w-full ptw-h-full ptw-p-4 ptw-outline-none ptw-bg-transparent ptw-resize-none ptw-m-0"
      :value="displayedSourceCode"
      readonly
      data-test-id="story-source-code"
      @scroll="onScroll"
    />
    <!-- eslint-disable vue/no-v-html -->
    <div
      v-else
      ref="scroller"
      class="ptw-w-full ptw-h-full ptw-overflow-auto"
      data-test-id="story-source-code"
      @scroll="onScroll"
    >
      <div
        class="__poveste-code __histoire-code ptw-p-4 ptw-w-fit"
        v-html="sourceHtml"
      />
    </div>
    <!-- eslint-enable vue/no-v-html -->
  </div>
</template>

<style scoped>
.__poveste-code-placeholder {
  color: inherit;
  font-size: inherit;
}
</style>
