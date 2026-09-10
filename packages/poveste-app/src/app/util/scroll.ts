import type { Ref } from 'vue'
import scrollIntoView from 'scroll-into-view-if-needed'
import { onMounted, watch } from 'vue'

// `el` is a template ref, so it is undefined until the component mounts and
// again once it unmounts. `autoScroll` has always guarded for that; the
// signature was the only thing claiming otherwise, and it made four callers
// pass a `Ref<HTMLDivElement | undefined>` into a parameter that denied it.
export function useScrollOnActive(active: Ref<boolean>, el: Ref<HTMLElement | undefined>) {
  watch(active, (value) => {
    if (value) {
      autoScroll()
    }
  }, { flush: 'post' })

  function autoScroll() {
    if (el.value) {
      scrollIntoView(el.value, {
        scrollMode: 'if-needed',
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth',
        boundary: document.body,
      })
    }
  }

  onMounted(() => {
    if (active.value) {
      autoScroll()
    }
  })

  return {
    autoScroll,
  }
}
