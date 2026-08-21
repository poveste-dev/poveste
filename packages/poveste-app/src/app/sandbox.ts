import type { StoryFile } from './types'
import { usePreferredDark } from '@vueuse/core'
import { createPinia } from 'pinia'
import { files } from 'virtual:$poveste-stories'
import { computed, createApp, h, onMounted, ref, watch } from 'vue'
import { parseQuery } from 'vue-router'
import GenericMountStory from './components/story/GenericMountStory.vue'
import GenericRenderStory from './components/story/GenericRenderStory.vue'
import { setupPluginApi } from './plugin.js'
import { previewDarkClasses, resolvePreviewDark } from './util/color-scheme.js'
import { PREVIEW_SETTINGS_REQUEST, PREVIEW_SETTINGS_SYNC, SANDBOX_HEIGHT, SANDBOX_READY, STATE_SYNC } from './util/const.js'
import { isDark } from './util/dark.js'
import { mapFile } from './util/mapping'
import { applyPreviewSettings, loadStoredPreviewSettings, receivedSettings } from './util/preview-settings.js'
import { createStateBridge } from './util/state-bridge.js'
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

// The app pushes settings when it sees the iframe load, which is one document
// swap away from being wrong: a push aimed at a document that is going away is
// dropped with no error and nothing re-sends it, leaving the sandbox on the
// stored value or on none at all (#75). Ask instead — a request can only come
// from a document that is running and listening.
if (window.parent && window.parent !== window) {
  window.parent.postMessage({ type: PREVIEW_SETTINGS_REQUEST }, window.location.origin)
}

// The story preview has its own color scheme, independent from the app chrome.
// The fallback covers settings stored before the option existed.
const prefersDark = usePreferredDark()
const previewDark = computed(() => resolvePreviewDark(receivedSettings.colorScheme, prefersDark.value, isDark.value))

/*
 * The class also has to land *inside* the story's `@scope` root, not only on
 * `<html>` (#101).
 *
 * User CSS is wrapped in `@scope (.__poveste-render-story)`, and `<html>` sits
 * above that root, so `@scope` cannot match it. A rule shaped like
 * `.dark .foo { … }` — which is what Tailwind's `darkMode: 'class'` and most
 * hand-written dark styling produce — is therefore inert, with no error and no
 * warning to say so.
 *
 * Putting it on the scope root itself is *not* enough: a descendant combinator
 * needs the ancestor to be matchable in scope too, and the root does not
 * qualify. `#app` is strictly inside the root, which does.
 *
 * It stays on `<html>` as well, for user CSS that is not scope-wrapped and for
 * anyone keying off `html.dark`.
 */
const darkClassTargets = [document.documentElement, document.querySelector('#app')]

watch(previewDark, (value) => {
  for (const el of darkClassTargets) {
    if (!el) continue

    for (const className of previewDarkClasses()) {
      el.classList.toggle(className, value)
    }
  }
}, {
  immediate: true,
})

const app = createApp({
  name: 'SandboxApp',

  setup() {
    const story = computed(() => file.value.story)
    const variant = computed(() => story.value?.variants.find(v => v.id === query.variantId))

    // The sandbox end of the bridge. It sends what the story changed rather than
    // the whole state, so a write here and a control edit on the host cannot
    // overwrite each other — see `createStateBridge` for what that used to cost.
    const bridge = createStateBridge((changes) => {
      window.parent?.postMessage({
        type: STATE_SYNC,
        state: changes,
      })
    })
    let mounted = false

    window.addEventListener('message', (event) => {
      // console.log('[sandbox] received message', event.data)
      if (event.data?.type === STATE_SYNC) {
        if (!mounted) return
        bridge.receive(variant.value.state, event.data.state)
      }
      else if (event.data?.type === PREVIEW_SETTINGS_SYNC) {
        applyPreviewSettings(event.data.settings)
      }
    })

    watch(() => variant.value.state, (value) => {
      bridge.send(toRawDeep(value, true))
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
