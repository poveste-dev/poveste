<script lang="ts" setup>
import type { HstEvent } from '../../stores/events'
import type { Story, Variant } from '../../types'
import { Icon } from '@iconify/vue'
import { SANDBOX_ERROR } from '@poveste/shared'
import { useEventListener } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, toRaw, watch } from 'vue'
import { useEventsStore } from '../../stores/events'
import { usePreviewSettingsStore } from '../../stores/preview-settings'
import { useStoryStore } from '../../stores/story'
import { useStoryErrorStore } from '../../stores/story-errors'
import { EVENT_SEND, PREVIEW_SETTINGS_REQUEST, PREVIEW_SETTINGS_SYNC, SANDBOX_HEIGHT, SANDBOX_READY, SANDBOX_RETARGET, STATE_SYNC } from '../../util/const'
import { firstReportedHeight } from '../../util/grid-cell-height'
import { trackWindow } from '../../util/keyboard'
import { getSandboxUrl } from '../../util/sandbox'
import { toRawDeep } from '../../util/state'
import { createStateBridge } from '../../util/state-bridge'
import StoryResponsivePreview from './StoryResponsivePreview.vue'

const props = withDefaults(defineProps<{
  story: Story
  variant: Variant
  autoHeight?: boolean
  responsive?: boolean
}>(), {
  responsive: true,
})

const settings = usePreviewSettingsStore().currentSettings
const errorStore = useStoryErrorStore()

const storyError = computed(() => errorStore.forVariant(props.story.id, props.variant.id))

// The realm re-renders on every retarget, so a stale error must not outlive the
// render that produced it — otherwise a fixed story stays marked until reload.
watch(() => [props.story.id, props.variant.id], () => {
  errorStore.clear(props.story.id, props.variant.id)
})

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

watch(() => props.variant.state, (state, previous) => {
  // Another variant's state, not a change to this one: this cell was handed a
  // new occupant (#240). The handover below syncs once the realm reports it in;
  // sending now would put the new variant's state into the old occupant.
  if (state !== previous) return
  syncState()
}, {
  deep: true,
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

// Whether a message is about the variant this cell shows now. A realm that has
// just been retargeted can still speak for its old occupant — a height from an
// observer, a state change from a timer — until it processes the handover, and
// those must not land on the new one. Unnamed messages come from sandboxes that
// predate retargeting; take those.
function fromCurrentOccupant(data: { storyId?: string, variantId?: string }) {
  return !data.variantId || (data.variantId === props.variant.id && data.storyId === props.story.id)
}

useEventListener(window, 'message', (event) => {
  // With many grid iframes mounted, every sandbox postMessage hits every
  // parent listener. Skip events that didn't originate from this iframe.
  if (event.source !== iframe.value?.contentWindow) return
  switch (event.data?.type) {
    case STATE_SYNC:
      if (!fromCurrentOccupant(event.data)) break
      updateVariantState(event.data.state)
      break
    case EVENT_SEND:
      logEvent(event.data.event)
      break
    case SANDBOX_READY:
      if (!fromCurrentOccupant(event.data)) break
      setPreviewReady()
      break
    case SANDBOX_ERROR:
      if (!fromCurrentOccupant(event.data)) break
      errorStore.report({
        message: event.data.message,
        stack: event.data.stack,
        storyId: props.story.id,
        variantId: props.variant.id,
      })
      break
    case PREVIEW_SETTINGS_REQUEST:
      syncSettings()
      break
    case SANDBOX_HEIGHT:
      if (!fromCurrentOccupant(event.data)) break
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
 * document per render — on the way in and on the way out, since what it
 * leaves behind is the point — and a realm is cold-reloaded after REUSE_LIMIT
 * retargets so what does accumulate stays bounded. A retarget that never
 * reports ready falls back to a reload.
 */
// What the iframe actually loads. Only a cold (re)load assigns it.
const iframeSrc = ref(sandboxUrl.value)
const isIframeLoaded = ref(false)
let retargets = 0
// The story whose document the realm holds — booted or retargeted into it.
let servedStory = props.story

let stopTrackKeyboard: (() => void) | undefined
let unmounted = false

function reload(url: string) {
  retargets = 0
  retargeting.value = false
  clearTimeout(retargetTimer)
  isIframeLoaded.value = false
  reportedHeight.value = null
  servedStory = props.story
  stopTrackKeyboard?.()
  stopTrackKeyboard = undefined
  // The document the realm booted with is the one wanted again — after a
  // retarget that timed out, or one past the reuse limit. The binding would
  // not change, so nothing would load; set the attribute by hand.
  if (iframeSrc.value === url && iframe.value) iframe.value.src = url
  iframeSrc.value = url
}

watch(sandboxUrl, (url) => {
  // A new occupant has agreed to nothing, so neither has this end. Kept as a
  // new bridge rather than a reset so there is one way to be in that state.
  bridge = createStateBridge(postState)
  storyStore.setPreviewReady(props.variant, false)

  const reuse = props.story.layout?.isolate !== true && servedStory.layout?.isolate !== true
  const target = iframe.value?.contentWindow
  if (reuse && isIframeLoaded.value && target && retargets < REUSE_LIMIT) {
    // Within a story the last height is the best guess until the new occupant
    // reports; snapping to the placeholder in between made rows jump twice.
    if (servedStory.id !== props.story.id) reportedHeight.value = null
    servedStory = props.story
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
    :responsive="responsive"
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
      :title="`Preview of ${story.title} — ${variant.title}`"
      @load="onIframeLoad()"
    />

    <!--
      Covers the preview rather than sitting beside it: a component that threw
      has rendered something, but nothing about it can be trusted — the template
      below is exactly what makes a broken story look like a working one (#323).
    -->
    <div
      v-if="storyError"
      class="poveste-story-error absolute inset-0 overflow-auto p-6 bg-white dark:bg-gray-900"
      data-testid="story-error"
    >
      <div class="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
        <Icon icon="carbon:warning-alt" class="w-5 h-5 flex-none" />
        <span>This component threw while rendering</span>
      </div>
      <p class="mt-2 font-mono text-sm text-red-700 dark:text-red-300" data-testid="story-error-message">
        {{ storyError.message }}
      </p>
      <pre
        v-if="storyError.stack"
        class="mt-4 text-xs whitespace-pre-wrap text-gray-600 dark:text-gray-400"
      >{{ storyError.stack }}</pre>
    </div>
  </StoryResponsivePreview>
</template>
