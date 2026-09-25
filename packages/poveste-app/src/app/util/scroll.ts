import type { Ref } from 'vue'
import { onMounted, watch } from 'vue'

/**
 * The closest ancestor that can actually scroll, or `null` for the viewport.
 *
 * `overlay` is in the test because it is what `overflow: overlay` computes to
 * where it is still supported, and an element scrolling under it would
 * otherwise be measured against the wrong box.
 */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (/auto|scroll|overlay/.test(style.overflowY + style.overflowX)) {
      return node
    }
  }
  return null
}

/** Whether the element is already wholly inside the box that would scroll. */
function isVisibleIn(el: HTMLElement, scroller: HTMLElement | null): boolean {
  const rect = el.getBoundingClientRect()
  const bounds = scroller?.getBoundingClientRect()
  const top = bounds?.top ?? 0
  const bottom = bounds?.bottom ?? window.innerHeight

  return rect.top >= top && rect.bottom <= bottom
}

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

  /*
   * What `scroll-into-view-if-needed` was here for: centre the element, but
   * only when it is not already on screen. The platform has no single option
   * for that pair — `block: 'center'` always scrolls, and `block: 'nearest'`
   * never centres — so the "if needed" half is the check above and the
   * "centre" half is the native call.
   *
   * Two `getBoundingClientRect` reads, on an activation event rather than per
   * frame, so this is not the per-event shape CONVENTIONS.md rule 6 is about.
   *
   * The library took `boundary: document.body`, which native has no equivalent
   * for: it will scroll every scrollable ancestor up to the document. The
   * chrome's layout is full-height and the document does not scroll, so there
   * is nothing above the pane for it to move.
   */
  function autoScroll() {
    const target = el.value
    if (!target || isVisibleIn(target, scrollParent(target))) {
      return
    }

    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
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
