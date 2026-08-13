<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Story, Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { HstCopyIcon } from '@poveste/controls'
import { useResizeObserver } from '@vueuse/core'
import { computed, nextTick, ref, toRefs, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePreviewSettingsStore } from '../../stores/preview-settings'
import { useStoryStore } from '../../stores/story'
import { previewDarkClasses, usePreviewDark } from '../../util/color-scheme'
import { povesteConfig } from '../../util/config'
import { getSourceCode } from '../../util/docs'
import { getContrastColor } from '../../util/preview-settings'
import { useScrollOnActive } from '../../util/scroll'
import { useCurrentVariantRoute } from '../../util/variant'
import CheckerboardPattern from '../misc/CheckerboardPattern.vue'
import ToolbarNewTab from '../toolbar/ToolbarNewTab.vue'
import GenericRenderStory from './GenericRenderStory.vue'
import StoryVariantSinglePreviewRemote from './StoryVariantSinglePreviewRemote.vue'

const props = defineProps({
  variant: {
    type: Object as PropType<Variant>,
    required: true,
  },

  story: {
    type: Object as PropType<Story>,
    required: true,
  },
})

const emit = defineEmits({
  resize: (_width: number, _height: number) => true,
})

const { variant } = toRefs(props)
const { isActive, targetRoute } = useCurrentVariantRoute(variant)

const storyStore = useStoryStore()

storyStore.setPreviewReady(props.variant, false)

function onReady() {
  storyStore.setPreviewReady(props.variant, true)
}

const router = useRouter()

function selectVariant() {
  router.push(targetRoute.value)
}

const el = ref<HTMLDivElement>()

const { autoScroll } = useScrollOnActive(isActive, el)

function reportSize() {
  if (!el.value || !props.variant.previewReady) return
  emit('resize', el.value.clientWidth, el.value.clientHeight)
  if (isActive.value) {
    autoScroll()
  }
}

useResizeObserver(el, reportSize)

// The observer fires once on mount and then only on a real size change. The
// sandbox reports ready about a second later, and the item often never changes
// size again — so the one callback that did happen was skipped by the guard
// above and the grid never learned any item's height. It then divided by a
// zero row count, produced `Infinitypx` for its scroll spacer, and stayed stuck
// at its initial ten items with the rest unreachable (#103).
watch(() => props.variant.previewReady, (ready) => {
  if (ready) {
    nextTick(reportSize)
  }
})

const settings = usePreviewSettingsStore().currentSettings

const previewDark = usePreviewDark(settings)

const contrastColor = computed(() => getContrastColor(settings))
const autoApplyContrastColor = computed(() => !!povesteConfig.autoApplyContrastColor)

const useIframe = computed(() => {
  const layout = props.story.layout
  if (layout?.type === 'grid' && layout.iframeGrid !== undefined) {
    return layout.iframeGrid
  }
  return povesteConfig.isolateStyles !== false
})
</script>

<template>
  <div
    ref="el"
    class="poveste-story-variant-grid-item cursor-default flex flex-col gap-y-1 group"
  >
    <!-- Header -->
    <div class="flex-none flex items-center">
      <RouterLink
        v-tooltip="variant.title"
        :to="targetRoute"
        class="rounded w-max px-2 py-0.5 min-w-16 cursor-pointer flex items-center gap-1 flex-shrink"
        :class="{
          'hover:bg-gray-200 text-gray-500 dark:hover:bg-gray-800': !isActive,
          'bg-primary-200 hover:bg-primary-300 text-primary-800 dark:bg-primary-700 dark:hover:bg-primary-800 dark:text-primary-200': isActive,
        }"
      >
        <Icon
          :icon="variant.icon ?? 'carbon:cube'"
          class="w-4 h-4 opacity-50"
          :class="{
            'text-gray-500': !isActive && !variant.iconColor,
            'bind-icon-color': !isActive && variant.iconColor,
          }"
        />
        <span class="truncate flex-1">{{ variant.title }}</span>
      </RouterLink>

      <!-- Toolbar -->
      <div class="flex-none ml-auto hidden group-hover:flex items-center">
        <HstCopyIcon
          :content="() => getSourceCode(story, variant)"
        />
        <ToolbarNewTab
          :variant="variant"
          :story="story"
        />
      </div>
    </div>

    <!-- Body -->
    <div
      class="border bg-white dark:bg-gray-700 rounded flex-1 p-4 relative"
      :class="{
        'border-gray-100 dark:border-gray-800': !isActive,
        'border-primary-200 dark:border-primary-900': isActive,
      }"
      data-test-id="sandbox-render"
      @click.stop="selectVariant()"
      @keyup="selectVariant()"
    >
      <div
        class="absolute inset-0 rounded bind-preview-bg"
        data-test-id="responsive-preview-bg"
      />

      <CheckerboardPattern
        v-if="settings.checkerboard"
        class="absolute inset-0 w-full h-full text-gray-500/20"
      />

      <div
        class="relative h-full"
        :style="{
          '--poveste-contrast-color': contrastColor,
          // Deprecated alias — keep so stories referencing `var(--histoire-contrast-color)` still work.
          '--histoire-contrast-color': contrastColor,
          'color': autoApplyContrastColor ? contrastColor : undefined,
        }"
      >
        <StoryVariantSinglePreviewRemote
          v-if="useIframe"
          :key="`iframe-${story.id}-${variant.id}`"
          :story="story"
          :variant="variant"
          auto-height
        />
        <GenericRenderStory
          v-else
          :key="`${story.id}-${variant.id}`"
          :variant="variant"
          :story="story"
          :dir="settings.textDirection"
          :class="previewDark ? previewDarkClasses() : undefined"
          @ready="onReady"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.bind-icon-color {
  color: v-bind('variant.iconColor');
}

.bind-preview-bg {
  background-color: v-bind('settings.backgroundColor');
}
</style>
