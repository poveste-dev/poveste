<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Story, Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { HstCopyIcon } from '@poveste/controls'
import { useResizeObserver } from '@vueuse/core'
import { computed, ref, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import { usePreviewSettingsStore } from '../../stores/preview-settings'
import { usePreviewDark } from '../../util/color-scheme'
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

Object.assign(props.variant, {
  previewReady: false,
})
function onReady() {
  Object.assign(props.variant, {
    previewReady: true,
  })
}

const router = useRouter()

function selectVariant() {
  router.push(targetRoute.value)
}

const el = ref<HTMLDivElement>()

const { autoScroll } = useScrollOnActive(isActive, el)

useResizeObserver(el, () => {
  if (props.variant.previewReady) {
    emit('resize', el.value!.clientWidth, el.value!.clientHeight)
    if (isActive.value) {
      autoScroll()
    }
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
    class="poveste-story-variant-grid-item ptw-cursor-default ptw-flex ptw-flex-col ptw-gap-y-1 ptw-group"
  >
    <!-- Header -->
    <div class="ptw-flex-none ptw-flex ptw-items-center">
      <RouterLink
        v-tooltip="variant.title"
        :to="targetRoute"
        class="ptw-rounded ptw-w-max ptw-px-2 ptw-py-0.5 ptw-min-w-16 ptw-cursor-pointer ptw-flex ptw-items-center ptw-gap-1 ptw-flex-shrink"
        :class="{
          'hover:ptw-bg-gray-200 ptw-text-gray-500 dark:hover:ptw-bg-gray-800': !isActive,
          'ptw-bg-primary-200 hover:ptw-bg-primary-300 ptw-text-primary-800 dark:ptw-bg-primary-700 dark:hover:ptw-bg-primary-800 dark:ptw-text-primary-200': isActive,
        }"
      >
        <Icon
          :icon="variant.icon ?? 'carbon:cube'"
          class="ptw-w-4 ptw-h-4 ptw-opacity-50"
          :class="{
            'ptw-text-gray-500': !isActive && !variant.iconColor,
            'bind-icon-color': !isActive && variant.iconColor,
          }"
        />
        <span class="ptw-truncate ptw-flex-1">{{ variant.title }}</span>
      </RouterLink>

      <!-- Toolbar -->
      <div class="ptw-flex-none ptw-ml-auto ptw-hidden group-hover:ptw-flex ptw-items-center">
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
      class="ptw-border ptw-bg-white dark:ptw-bg-gray-700 ptw-rounded ptw-flex-1 ptw-p-4 ptw-relative"
      :class="{
        'ptw-border-gray-100 dark:ptw-border-gray-800': !isActive,
        'ptw-border-primary-200 dark:ptw-border-primary-900': isActive,
      }"
      data-test-id="sandbox-render"
      @click.stop="selectVariant()"
      @keyup="selectVariant()"
    >
      <div
        class="ptw-absolute ptw-inset-0 ptw-rounded bind-preview-bg"
        data-test-id="responsive-preview-bg"
      />

      <CheckerboardPattern
        v-if="settings.checkerboard"
        class="ptw-absolute ptw-inset-0 ptw-w-full ptw-h-full ptw-text-gray-500/20"
      />

      <div
        class="ptw-relative ptw-h-full"
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
          :class="{
            [povesteConfig.theme.darkClass]: previewDark,
          }"
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
