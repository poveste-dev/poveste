<script lang="ts" setup>
import type { Highlighter } from 'shiki'
import type { Story, Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { HstCopyIcon } from '@poveste/controls'
import { unindent } from '@poveste/shared'
import { clientSupportPlugins } from 'virtual:$poveste-support-plugins-client'
import { computed, markRaw, nextTick, onMounted, ref, shallowRef, watch, watchEffect } from 'vue'
import { isDark } from '../../util/dark'
import { getHighlighter } from '../../util/highlighter'
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
  try {
    highlighter.value = await getHighlighter()
  }
  catch (e) {
    // Leave `highlighter` unset so the pane falls back to the plain textarea
    // rendering instead of showing nothing at all.
    console.error(e)
  }
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
    class="poveste-story-source-code bg-gray-50 dark:bg-gray-750 h-full overflow-hidden flex flex-col"
  >
    <!-- Toolbar -->
    <div
      v-if="!error"
      class="h-10 flex-none border-b border-solid border-gray-500/5 px-4 flex items-center gap-2"
    >
      <div class="text-gray-900 dark:text-gray-100">
        Source
      </div>
      <div class="flex-1" />

      <!-- Display source modes -->
      <div class="flex flex-none gap-px h-full py-2">
        <button
          v-tooltip="!dynamicSourceCode ? 'Dynamic source code is not available' : displayedSource !== 'dynamic' ? 'Switch to dynamic source' : null"
          class="flex items-center gap-1 h-full px-1 bg-gray-500/10 rounded-l transition-all ease-[cubic-bezier(0,1,.6,1)] duration-300 overflow-hidden"
          :class="[
            displayedSource !== 'dynamic' ? 'max-w-6 opacity-70' : 'max-w-[82px] text-primary-600 dark:text-primary-400',
            dynamicSourceCode ? 'cursor-pointer hover:bg-gray-500/30 active:bg-gray-600/50' : 'opacity-50',
          ]"
          @click="dynamicSourceCode && (displayedSource = 'dynamic')"
        >
          <Icon
            icon="carbon:flash"
            class="w-4 h-4 flex-none"
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
          class="flex items-center gap-1 h-full px-1 bg-gray-500/10 rounded-r transition-all ease-[cubic-bezier(0,1,.6,1)] duration-300 overflow-hidden"
          :class="[
            displayedSource !== 'static' ? 'max-w-6 opacity-70' : 'max-w-[63px] text-primary-600 dark:text-primary-400',
            staticSourceCode ? 'cursor-pointer hover:bg-gray-500/30 active:bg-gray-600/50' : 'opacity-50',
          ]"
          @click="staticSourceCode && (displayedSource = 'static')"
        >
          <Icon
            icon="carbon:document"
            class="w-4 h-4 flex-none"
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
        class="flex-none"
      />
    </div>

    <div
      v-if="error"
      class="text-red-500 h-full p-2 overflow-auto font-mono text-sm"
    >
      Error: {{ error }}
    </div>

    <BaseEmpty v-else-if="!displayedSourceCode">
      <Icon
        icon="carbon:code-hide"
        class="w-8 h-8 opacity-50 mb-6"
      />
      <span>Not available</span>
    </BaseEmpty>

    <textarea
      v-else-if="!sourceHtml"
      ref="scroller"
      class="__poveste-code-placeholder w-full h-full p-4 outline-none bg-transparent resize-none m-0"
      :value="displayedSourceCode"
      readonly
      data-test-id="story-source-code"
      @scroll="onScroll"
    />
    <!-- eslint-disable vue/no-v-html -->
    <div
      v-else
      ref="scroller"
      class="w-full h-full overflow-auto"
      data-test-id="story-source-code"
      @scroll="onScroll"
    >
      <div
        class="__poveste-code __histoire-code p-4 w-fit"
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
