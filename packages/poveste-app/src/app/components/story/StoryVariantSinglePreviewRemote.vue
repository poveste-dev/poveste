<script lang="ts" setup>
import type { HstEvent } from '../../stores/events'
import type { Story, Variant } from '../../types'
import { applyState } from '@poveste/shared'
import { useEventListener } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, toRaw, watch } from 'vue'
import { useEventsStore } from '../../stores/events'
import { usePreviewSettingsStore } from '../../stores/preview-settings'
import { useStoryStore } from '../../stores/story'
import { EVENT_SEND, PREVIEW_SETTINGS_REQUEST, PREVIEW_SETTINGS_SYNC, SANDBOX_HEIGHT, SANDBOX_READY, STATE_SYNC } from '../../util/const'
import { firstReportedHeight } from '../../util/grid-cell-height'
import { trackWindow } from '../../util/keyboard'
import { getSandboxUrl } from '../../util/sandbox'
import { toRawDeep } from '../../util/state'
import StoryResponsivePreview from './StoryResponsivePreview.vue'

const props = defineProps<{
  story: Story
  variant: Variant
  autoHeight?: boolean
}>()

const settings = usePreviewSettingsStore().currentSettings

// Iframe

const iframe = ref<HTMLIFrameElement>()

function syncState() {
  if (iframe.value?.contentWindow && props.variant.previewReady) {
    iframe.value.contentWindow.postMessage({
      type: STATE_SYNC,
      state: toRawDeep(props.variant.state, true),
    })
  }
}

// The host end of the bridge, and the same flag as `plugin-vue`'s state sync
// with the same #95 caveat: `synced` may only be set when the write below will
// actually provoke the watcher. `applyState` reports that now. Setting it
// unconditionally means an apply that changes nothing leaves it set, and the
// next real edit is skipped instead — a control that does nothing.
let synced = false

watch(() => props.variant.state, () => {
  if (synced) {
    synced = false
    return
  }
  syncState()
}, {
  deep: true,
  immediate: true,
})

const storyStore = useStoryStore()

storyStore.setPreviewReady(props.variant, false)

// Floor for a reported height, and what a cell shows before its sandbox reports.
const MIN_HEIGHT = 40

// A cell may grow to its story but not past this, because a grid row is as tall
// as its tallest item — one long variant would otherwise stretch every sibling
// in its row to match.
const MAX_AUTO_HEIGHT = 400

const reportedHeight = ref<number | null>(null)

const placeholderHeight = computed(() => (
  firstReportedHeight.value?.storyId === props.story.id ? firstReportedHeight.value.height : MIN_HEIGHT
))

useEventListener(window, 'message', (event) => {
  // With many grid iframes mounted, every sandbox postMessage hits every
  // parent listener. Skip events that didn't originate from this iframe.
  if (event.source !== iframe.value?.contentWindow) return
  switch (event.data?.type) {
    case STATE_SYNC:
      updateVariantState(event.data.state)
      break
    case EVENT_SEND:
      logEvent(event.data.event)
      break
    case SANDBOX_READY:
      setPreviewReady()
      break
    case PREVIEW_SETTINGS_REQUEST:
      syncSettings()
      break
    case SANDBOX_HEIGHT:
      // The sandbox reports on its first frames, before the story mounts, and
      // those carry the empty body — 0, or a few px of margin. Clamping one to
      // the floor would count as a real measurement and lock the cell out of
      // the placeholder below, which is what left rows stuck at 40px. Anything
      // under the floor renders as the floor anyway, so nothing is lost by
      // waiting for a bigger number.
      if (typeof event.data.h === 'number' && event.data.h >= MIN_HEIGHT) {
        const next = event.data.h
        if (next !== reportedHeight.value) reportedHeight.value = next
        if (props.autoHeight && firstReportedHeight.value?.storyId !== props.story.id) {
          firstReportedHeight.value = { storyId: props.story.id, height: next }
        }
      }
      break
  }
})

function updateVariantState(state: any) {
  synced = applyState(props.variant.state, state)
}

function logEvent(event: HstEvent) {
  const eventsStore = useEventsStore()
  eventsStore.addEvent(event)
}

function setPreviewReady() {
  storyStore.setPreviewReady(props.variant, true)
}

const sandboxUrl = computed(() => {
  return getSandboxUrl(props.story, props.variant)
})

const isIframeLoaded = ref(false)

let stopTrackKeyboard: (() => void) | undefined
let unmounted = false

watch(sandboxUrl, () => {
  isIframeLoaded.value = false
  storyStore.setPreviewReady(props.variant, false)
  stopTrackKeyboard?.()
  stopTrackKeyboard = undefined
})

onBeforeUnmount(() => {
  unmounted = true
  stopTrackKeyboard?.()
})

// Settings

function syncSettings() {
  if (iframe.value?.contentWindow) {
    iframe.value.contentWindow.postMessage({
      type: PREVIEW_SETTINGS_SYNC,
      settings: toRaw(settings),
    })
  }
}

watch(() => settings, () => {
  syncSettings()
}, {
  deep: true,
  immediate: true,
})

// `auto-height` — the grid — sizes a cell to the story it renders, and that
// wins over the responsive height. The responsive size is for examining one
// component at a viewport; applied to every cell it just makes the grid
// unreadable. A stored `responsiveHeight` of 600 gives 729px cells holding one
// small button, which is the shape #198 was filed about.
function previewStyle(isResponsiveEnabled: boolean, finalWidth: number | null, finalHeight: number | null) {
  const style: Record<string, string> = {}

  if (isResponsiveEnabled) {
    if (finalWidth) style.width = `${finalWidth}px`
    if (finalHeight) style.height = `${finalHeight}px`
  }

  if (props.autoHeight) {
    style.height = `${Math.min(reportedHeight.value ?? placeholderHeight.value, MAX_AUTO_HEIGHT)}px`
  }

  return style
}

// Iframe load

function onIframeLoad() {
  if (unmounted) {
    return
  }
  isIframeLoaded.value = true
  syncState()
  syncSettings()
  stopTrackKeyboard?.()
  if (iframe.value?.contentWindow) {
    stopTrackKeyboard = trackWindow(iframe.value.contentWindow)
  }
}
</script>

<template>
  <StoryResponsivePreview
    v-slot="{ isResponsiveEnabled, finalWidth, finalHeight, resizing }"
    class="poveste-story-variant-single-preview-remote"
    :variant="variant"
  >
    <iframe
      ref="iframe"
      :src="sandboxUrl"
      class="w-full h-full relative"
      :class="{
        'invisible': !isIframeLoaded,
        'pointer-events-none': resizing,
      }"
      :style="previewStyle(isResponsiveEnabled, finalWidth, finalHeight)"
      data-test-id="preview-iframe"
      @load="onIframeLoad()"
    />
  </StoryResponsivePreview>
</template>
