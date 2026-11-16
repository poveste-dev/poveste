import type { A11yResult, A11yRunner } from './a11y.js'
import { onScopeDispose, ref, shallowRef, watch } from 'vue'

export type A11yStatus = 'idle' | 'running' | 'done' | 'error' | 'unavailable'

export interface A11yCheckOptions {
  /** The runner for the variant shown, if a sandbox renders it. */
  runner: () => A11yRunner | undefined
  disabledRules: () => string[]
  /** Run when a runner appears and after each change, rather than only on request. */
  automatic: () => boolean
  /** What the result depends on. A change re-runs, debounced, while automatic. */
  changes: () => unknown
  delay?: number
}

/** After the last change, so a reader typing into a control gets one run, not one per key. */
export const A11Y_DEBOUNCE = 300

export function useA11yCheck(options: A11yCheckOptions) {
  const status = ref<A11yStatus>('idle')
  const result = shallowRef<A11yResult>()
  const error = ref<string>()

  // A run that finishes after a newer one started, or after the variant changed, is dropped.
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  async function run() {
    clearTimeout(timer)
    const runner = options.runner()
    if (!runner) {
      status.value = 'unavailable'
      return
    }
    const mine = ++generation
    status.value = 'running'
    try {
      const answer = await runner(options.disabledRules())
      if (mine !== generation) return
      result.value = answer
      error.value = undefined
      status.value = 'done'
    }
    catch (thrown) {
      if (mine !== generation) return
      error.value = thrown instanceof Error ? thrown.message : String(thrown)
      status.value = 'error'
    }
  }

  watch(options.runner, (runner) => {
    generation++
    clearTimeout(timer)
    result.value = undefined
    error.value = undefined
    if (!runner) {
      status.value = 'unavailable'
    }
    else if (options.automatic()) {
      run()
    }
    else {
      status.value = 'idle'
    }
  }, { immediate: true })

  watch(options.changes, () => {
    if (!options.automatic() || !options.runner()) return
    clearTimeout(timer)
    timer = setTimeout(run, options.delay ?? A11Y_DEBOUNCE)
  }, { deep: true })

  onScopeDispose(() => {
    generation++
    clearTimeout(timer)
  })

  return { status, result, error, run }
}
