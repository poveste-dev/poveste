<script lang="ts" setup>
import type { HstEvent } from '../../stores/events'
import type { Story, Variant } from '../../types'
import { useEventListener } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, toRaw, watch } from 'vue'
import { useEventsStore } from '../../stores/events'
import { usePreviewSettingsStore } from '../../stores/preview-settings'
import { useStoryStore } from '../../stores/story'
import { EVENT_SEND, PREVIEW_SETTINGS_REQUEST, PREVIEW_SETTINGS_SYNC, SANDBOX_HEIGHT, SANDBOX_READY, SANDBOX_RETARGET, STATE_SYNC } from '../../util/const'
import { firstReportedHeight } from '../../util/grid-cell-height'
import { trackWindow } from '../../util/keyboard'
import { getSandboxUrl } from '../../util/sandbox'
import { toRawDeep } from '../../util/state'
import { createStateBridge } from '../../util/state-bridge'
import StoryResponsivePreview from './StoryResponsivePreview.vue'

const props = defineProps<{
  story: Story
  variant: Variant
  autoHeight?: boolean
}>()

const settings = usePreviewSettingsStore().currentSettings

// Iframe

const iframe = ref<HTMLIFrameElement>()

// The host end of the bridge. It sends what this side changed rather than the
// whole state, so a write here and a write in the story cannot overwrite each
// other — see `createStateBridge` for what that used to cost.
function postState(changes: Record<string, any>) {
  iframe.value?.contentWindow?.postMessage({
    type: STATE_SYNC,
    state: changes,
  })
}

let bridge = createStateBridge(postState)

function syncState() {
  // Nothing can be sent yet, so nothing may be recorded as agreed either — the
  // baseline would then hold changes the sandbox has never seen, and send it
  // only the ones that came after. Returning early leaves the first message
  // that does go out carrying the whole state, which is what it carried before.
  if (!iframe.value?.contentWindow || !props.variant.previewReady) return

  bridge.send(toRawDeep(props.variant.state, true))
}

watch(() => props.variant.state, () => {
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
      // A ready for an occupant this host has since moved on from. Unnamed
      // readies come from sandboxes that predate retargeting; take those.
      if (event.data.variantId && (event.data.variantId !== props.variant.id || event.data.storyId !== props.story.id)) break
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
  bridge.receive(props.variant.state, state)
}

function logEvent(event: HstEvent) {
  const eventsStore = useEventsStore()
  eventsStore.addEvent(event)
}

// Realm reuse state (#240) — see the block below `sandboxUrl` for the design.
const REUSE_LIMIT = 30
const RETARGET_TIMEOUT = 8_000
const retargeting = ref(false)
let retargetTimer: ReturnType<typeof setTimeout> | undefined

function setPreviewReady() {
  retargeting.value = false
  clearTimeout(retargetTimer)
  storyStore.setPreviewReady(props.variant, true)
  // A fresh mount starts from the story's own state; what this side holds for
  // the variant — earlier control edits, or the state it had the last time this
  // realm showed it — is the truth the story should render.
  syncState()
}

const sandboxUrl = computed(() => {
  return getSandboxUrl(props.story, props.variant)
})

/*
 * Realm reuse (#240). A sandbox document is a full realm boot — bundle
 * evaluation, story mount — and same-origin iframes boot serially on one main
 * thread, so a grid that scrolls pays that for every cell that enters the
 * window. Instead of changing `src`, a warm realm is told which variant to
 * show next and remounts it in place: the order of the realm boot cost becomes
 * the number of cells on screen, not the number scrolled past.
 *
 * What survives between occupants is the realm's JS state — globals a story
 * patched, timers it leaked. Style isolation is untouched. Two valves for
 * stories that cannot share: `layout.isolate` opts a story back into a cold
 * document per render, and a realm is cold-reloaded after REUSE_LIMIT
 * retargets so what does accumulate stays bounded. A retarget that never
 * reports ready falls back to a reload.
 */
const reuse = computed(() => props.story.layout?.isolate !== true)
// What the iframe actually loads. Only a cold (re)load assigns it.
const iframeSrc = ref(sandboxUrl.value)
const isIframeLoaded = ref(false)
let retargets = 0

let stopTrackKeyboard: (() => void) | undefined
let unmounted = false

function reload(url: string) {
  retargets = 0
  retargeting.value = false
  clearTimeout(retargetTimer)
  isIframeLoaded.value = false
  stopTrackKeyboard?.()
  stopTrackKeyboard = undefined
  iframeSrc.value = url
}

watch(sandboxUrl, (url) => {
  // A new occupant has agreed to nothing, so neither has this end. Kept as a
  // new bridge rather than a reset so there is one way to be in that state.
  bridge = createStateBridge(postState)
  storyStore.setPreviewReady(props.variant, false)
  reportedHeight.value = null

  const target = iframe.value?.contentWindow
  if (reuse.value && isIframeLoaded.value && target && retargets < REUSE_LIMIT) {
    retargets++
    retargeting.value = true
    target.postMessage({ type: SANDBOX_RETARGET, storyId: props.story.id, variantId: props.variant.id }, window.location.origin)
    clearTimeout(retargetTimer)
    retargetTimer = setTimeout(() => {
      if (retargeting.value && !unmounted) reload(url)
    }, RETARGET_TIMEOUT)
    return
  }

  reload(url)
})

onBeforeUnmount(() => {
  unmounted = true
  clearTimeout(retargetTimer)
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
  retargets = 0
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
      :src="iframeSrc"
      class="w-full h-full relative"
      :class="{
        'invisible': !isIframeLoaded || retargeting,
        'pointer-events-none': resizing,
      }"
      :style="previewStyle(isResponsiveEnabled, finalWidth, finalHeight)"
      data-testid="preview-iframe"
      @load="onIframeLoad()"
    />
  </StoryResponsivePreview>
</template>
