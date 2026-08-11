import type { StoryFile } from './types'
import { applyState } from '@poveste/shared'
import { usePreferredDark } from '@vueuse/core'
import { createPinia } from 'pinia'
import { files } from 'virtual:$poveste-stories'
import { computed, createApp, h, onMounted, ref, watch } from 'vue'
import { parseQuery } from 'vue-router'
import GenericMountStory from './components/story/GenericMountStory.vue'
import GenericRenderStory from './components/story/GenericRenderStory.vue'
import { setupPluginApi } from './plugin.js'
import { resolvePreviewDark } from './util/color-scheme.js'
import { povesteConfig } from './util/config.js'
import { PREVIEW_SETTINGS_SYNC, SANDBOX_HEIGHT, SANDBOX_READY, STATE_SYNC } from './util/const.js'
import { isDark } from './util/dark.js'
import { mapFile } from './util/mapping'
import { applyPreviewSettings, loadStoredPreviewSettings, receivedSettings } from './util/preview-settings.js'
import { toRawDeep } from './util/state.js'

const query = parseQuery(window.location.search)
const file = ref<StoryFile>(mapFile(files.find(f => f.id === query.storyId)))

// Sandboxes opened on their own (the "open in a new tab" toolbar button) never
// receive a PREVIEW_SETTINGS_SYNC, and inside the app the first one only lands
// after the iframe is already visible. Both read the same storage the app
// writes to, so seed from it and let the sync take over from there.
const storedSettings = loadStoredPreviewSettings()
if (storedSettings) {
  applyPreviewSettings(storedSettings)
}

// The story preview has its own color scheme, independent from the app chrome.
// The fallback covers settings stored before the option existed.
const prefersDark = usePreferredDark()
const previewDark = computed(() => resolvePreviewDark(receivedSettings.colorScheme, prefersDark.value, isDark.value))

// `sandboxDarkClass` is poveste's own deprecated config option, superseded by
// `theme.darkClass`. Still honoured on purpose: dropping it would silently stop
// applying the class for anyone who set it. Removing the option is a breaking
// config change and belongs to a major, not here.
watch(previewDark, (value) => {
  if (value) {
    // eslint-disable-next-line ts/no-deprecated
    document.documentElement.classList.add(povesteConfig.sandboxDarkClass)
    document.documentElement.classList.add(povesteConfig.theme.darkClass)
  }
  else {
    // eslint-disable-next-line ts/no-deprecated
    document.documentElement.classList.remove(povesteConfig.sandboxDarkClass)
    document.documentElement.classList.remove(povesteConfig.theme.darkClass)
  }
}, {
  immediate: true,
})

const app = createApp({
  name: 'SandboxApp',

  setup() {
    const story = computed(() => file.value.story)
    const variant = computed(() => story.value?.variants.find(v => v.id === query.variantId))

    // `synced` is the sandbox end of the same flag the host holds, with the same
    // #95 caveat: only set it when the apply will actually provoke the watcher
    // below, which is what `applyState`'s return value reports. Set it
    // unconditionally and an apply that changes nothing leaves it stuck, so the
    // next edit the story makes never reaches the host.
    let synced = false
    let mounted = false

    window.addEventListener('message', (event) => {
      // console.log('[sandbox] received message', event.data)
      if (event.data?.type === STATE_SYNC) {
        if (!mounted) return
        synced = applyState(variant.value.state, event.data.state)
      }
      else if (event.data?.type === PREVIEW_SETTINGS_SYNC) {
        applyPreviewSettings(event.data.settings)
      }
    })

    watch(() => variant.value.state, (value) => {
      if (synced && mounted) {
        synced = false
        return
      }
      window.parent?.postMessage({
        type: STATE_SYNC,
        state: toRawDeep(value, true),
      })
    }, {
      deep: true,
    })

    onMounted(() => {
      mounted = true
    })

    return {
      story,
      variant,
    }
  },

  render() {
    return [
      h('div', { class: '__poveste-sandbox-hidden' }, [
        h(GenericMountStory, {
          key: file.value.story.id,
          story: file.value.story,
        }),
      ]),
      this.story && this.variant
        ? h(GenericRenderStory, { story: this.story, variant: this.variant, onReady: () => {
            window.parent?.postMessage({
              type: SANDBOX_READY,
            })
          } })
        : null,
    ]
  },
})
app.use(createPinia())
app.mount('#app')

// Tagging body itself as a story render root puts components teleported to
// document.body (floating-vue popper, dialogs) inside the user-CSS @scope
// boundary applied in dev. The custom-controls class opts out of poveste-app
// source-level rules that add overflow/min-height to the render root.
document.body.classList.add('__poveste-render-story', '__poveste-render-custom-controls')

let pendingFrame: number | null = null
let lastReportedHeight = -1
function reportHeight() {
  pendingFrame = null
  const renderRoot = document.querySelector('.__poveste-render-story')
  const h = renderRoot
    ? Math.ceil(renderRoot.getBoundingClientRect().height)
    : Math.ceil(document.body.scrollHeight)
  if (h === lastReportedHeight) return
  lastReportedHeight = h
  // Same-origin: parent and iframe are both served by the poveste dev /
  // build server, so scope the target rather than broadcasting.
  window.parent?.postMessage({ type: SANDBOX_HEIGHT, h }, window.location.origin)
}
function scheduleReport() {
  if (pendingFrame !== null) return
  pendingFrame = requestAnimationFrame(reportHeight)
}
const ro = new ResizeObserver(scheduleReport)
ro.observe(document.body)
requestAnimationFrame(scheduleReport)

if (import.meta.hot) {
  /* #__PURE__ */ setupPluginApi()
}
