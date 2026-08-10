import { applyState, clone } from '@poveste/shared'
import { watch as _watch } from '@poveste/vendors/vue'

function cleanupState(state: Record<string, any>): Record<string, any> {
  const result = {}
  for (const key in state) {
    if (key === 'Hst') continue
    const value = state[key]
    if (typeof value === 'function') continue
    if (typeof value === 'undefined') continue
    if (value instanceof HTMLElement) continue
    if (typeof value === 'object' && value?.$$) continue
    result[key] = value
  }
  return result
}

export function syncState(variantState, onChange: (state) => unknown) {
  // Same flag, same #95 caveat as `plugin-vue` and the sandbox bridge: `apply`
  // may only claim the next firing when its write will actually cause one, and
  // `applyState` reports that. It matters more here than anywhere else, because
  // the render loop calls `apply` on *every animation frame* whether or not the
  // story did anything — set the flag unconditionally and it is set through
  // roughly every other frame, ready to eat whatever lands in it.
  //
  // The `onChange` direction below still sets it blind. Nothing here can see
  // whether handing the state to the component changed anything, so the same
  // hazard remains on that side. It cannot be exercised today: `syncState` is
  // only reachable through `getLegacyStateApi`, which needs Svelte 4's
  // `$capture_state`/`$inject_state`, and the Svelte example is on 5 with both
  // state-sync specs already `fixme` under #81. Whoever revives that path
  // inherits this note.
  let syncing = false

  const _stop = _watch(() => variantState, (value) => {
    if (value == null) return
    if (syncing) {
      syncing = false
      return
    }
    syncing = true
    onChange(cleanupState(value))
  }, {
    deep: true,
    immediate: true,
  })

  function apply(value) {
    if (value == null) return
    if (syncing) {
      syncing = false
      return
    }
    syncing = applyState(variantState, clone(cleanupState(value)))
  }

  return {
    apply,
    stop() {
      _stop()
    },
  }
}
