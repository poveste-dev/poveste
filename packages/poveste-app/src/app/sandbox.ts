import type { StoryFile } from './types'
import { reportStoryError } from '@poveste/shared'
import { usePreferredDark } from '@vueuse/core'
import { createPinia } from 'pinia'
import { files, onUpdate } from 'virtual:$poveste-stories'
import { computed, createApp, h, onMounted, ref, watch } from 'vue'
import { parseQuery } from 'vue-router'
import GenericMountStory from './components/story/GenericMountStory.vue'
import GenericRenderStory from './components/story/GenericRenderStory.vue'
import { previewDarkClasses, resolvePreviewDark } from './util/color-scheme.js'
import { PREVIEW_SETTINGS_REQUEST, PREVIEW_SETTINGS_SYNC, SANDBOX_HEIGHT, SANDBOX_READY, SANDBOX_RETARGET, STATE_SYNC } from './util/const.js'
import { isDark } from './util/dark.js'
import { mapFile } from './util/mapping'
import { applyPreviewSettings, loadStoredPreviewSettings, receivedSettings } from './util/preview-settings.js'
import { createStateBridge } from './util/state-bridge.js'
import { toRawDeep } from './util/state.js'

const query = parseQuery(window.location.search)

// What this realm serves. Set from the URL on boot, and again by a
// SANDBOX_RETARGET from the host: a warm realm is handed the next story or
// variant instead of being torn down for a new document (#240).
const storyId = ref(typeof query.storyId === 'string' ? query.storyId : null)
const variantId = ref(typeof query.variantId === 'string' ? query.variantId : null)

// `files` is `[]` until the dev server's first collect lands. The app's iframe
// never sees that — it mounts after — but a sandbox opened on its own does, and
// the list only arrives through `onUpdate`.
const file = ref<StoryFile | null>(null)
function resolveFile(list: StoryFile[] = files) {
  const found = list.find(f => f.id === storyId.value)
  // Same story, different variant: keep the mapped file so the story component
  // is not remounted for a variant switch.
  if (found && file.value?.story.id === found.id) return
  file.value = found ? mapFile(found) : null
}
resolveFile()
onUpdate((newFiles: StoryFile[]) => {
  if (!file.value) resolveFile(newFiles)
})

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

// The framework hooks catch what the framework swallows; this catches what
// escapes it — a throw from an event handler, a rejected promise, an async
// effect. Neither alone is enough: Vue never lets a render error reach the
// window, and no framework hook sees an error raised outside its own call
// stack (#323).
function reportUncaught(error: unknown) {
  reportStoryError(error, { storyId: storyId.value, variantId: variantId.value })
}
window.addEventListener('error', event => reportUncaught(event.error ?? event.message))
window.addEventListener('unhandledrejection', event => reportUncaught(event.reason))

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

// Height reporting state, declared here because the retarget handler inside the
// app resets it.
let pendingFrame: number | null = null
let lastReportedHeight = -1

const app = createApp({
  name: 'SandboxApp',

  setup() {
    const story = computed(() => file.value?.story)
    const variant = computed(() => story.value?.variants.find(v => v.id === variantId.value))

    // The sandbox end of the bridge. It sends what the story changed rather than
    // the whole state, so a write here and a control edit on the host cannot
    // overwrite each other — see `createStateBridge` for what that used to cost.
    // Named, like SANDBOX_READY and SANDBOX_HEIGHT: after a retarget the host
    // is waiting on the new occupant, and anything the old one still says
    // must be told apart from that.
    const postState = (changes: Record<string, any>) => {
      window.parent?.postMessage({
        type: STATE_SYNC,
        state: changes,
        storyId: storyId.value,
        variantId: variantId.value,
      })
    }
    let bridge = createStateBridge(postState)
    let mounted = false

    window.addEventListener('message', (event) => {
      // console.log('[sandbox] received message', event.data)
      if (event.data?.type === STATE_SYNC) {
        if (!mounted || !variant.value) return
        bridge.receive(variant.value.state, event.data.state)
      }
      else if (event.data?.type === PREVIEW_SETTINGS_SYNC) {
        applyPreviewSettings(event.data.settings)
      }
      else if (event.data?.type === SANDBOX_RETARGET) {
        // A new occupant: nothing has been agreed with the host about it, and
        // the last height belonged to the old one. The keyed render below
        // remounts and reports both afresh.
        bridge = createStateBridge(postState)
        lastReportedHeight = -1
        variantId.value = typeof event.data.variantId === 'string' ? event.data.variantId : null
        storyId.value = typeof event.data.storyId === 'string' ? event.data.storyId : null
        resolveFile()
      }
    })

    watch(() => variant.value?.state, (value, previous) => {
      // A retarget swapped the occupant, not a story writing its state. The
      // new one has agreed to nothing yet, and a send here would carry its
      // whole state — defaults, or a copy left from the last time this realm
      // served it — over what the host holds, and the host's does come down
      // once the new mount reports ready.
      if (!value || value !== previous) return
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
    if (!file.value) {
      return null
    }

    return [
      h('div', { class: '__poveste-sandbox-hidden' }, [
        h(GenericMountStory, {
          key: file.value.story.id,
          story: file.value.story,
          // This realm serves exactly one variant at a time; a plugin that
          // mounts variants can skip all the others (#197). Falls through
          // GenericMountStory as an attr, so plugins that don't know the prop
          // ignore it.
          targetVariantId: variantId.value,
        }),
      ]),
      this.story && this.variant
        // Keyed so a retarget is a clean unmount and mount, not a prop update
        // into a host that is halfway through rendering the previous occupant.
        ? h(GenericRenderStory, { key: `${this.story.id}/${this.variant.id}`, story: this.story, variant: this.variant, onReady: () => {
            // Named, so a host that has since retargeted this realm can tell a
            // late ready for the old occupant from the one it is waiting for.
            window.parent?.postMessage({
              type: SANDBOX_READY,
              storyId: this.story.id,
              variantId: this.variant.id,
            })
            // A retarget to a same-height story would otherwise never report:
            // the observer only fires on a change.
            scheduleReport()
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
  window.parent?.postMessage({ type: SANDBOX_HEIGHT, h, storyId: storyId.value, variantId: variantId.value }, window.location.origin)
}
function scheduleReport() {
  if (pendingFrame !== null) return
  pendingFrame = requestAnimationFrame(reportHeight)
}
const ro = new ResizeObserver(scheduleReport)
ro.observe(document.body)
requestAnimationFrame(scheduleReport)

// Dev only, and loaded lazily on purpose: a static import of `plugin.js`
// carried the app router — and through its lazy routes every app view and
// their CSS — into the sandbox graph, so each sandbox realm parsed ~100 KB of
// chrome styles it can never match (#219). `import.meta.env.DEV` is a build-time
// literal, so the whole branch, dynamic import included, drops out of a build.
if (import.meta.env.DEV && import.meta.hot) {
  import('./plugin.js').then(({ setupPluginApi }) => setupPluginApi())
}
