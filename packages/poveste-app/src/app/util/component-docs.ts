import type { AutoDocsSection, ComponentDoc, DocTag } from '@poveste/shared'
import type { Ref } from 'vue'
import { onBeforeUnmount, ref, watch } from 'vue'

export interface ComponentDocsEntry {
  /** Relative to the book's root. */
  file: string
  /** The component's own name, else the file name without its extension. */
  name: string
  doc?: ComponentDoc
  error?: string
}

interface StoryDocsResult {
  storyId: string
  components: Record<string, { doc?: ComponentDoc, error?: string, name?: string }>
  /** Why auto-docs is off for this story, as the terminal says it. */
  off?: string
}

export function toEntries(result: StoryDocsResult): ComponentDocsEntry[] {
  return Object.entries(result.components).map(([file, { doc, error, name }]) => ({
    file,
    // A JSX story's result is keyed by the story file, so the extractor names the component,
    // and an unnamed one, such as an inline function, goes by the story's file name.
    name: doc?.name ?? name ?? file.split('/').pop()!.replace(/(?:\.story)?\.[^.]+$/, ''),
    ...doc ? { doc } : {},
    ...error ? { error } : {},
  }))
}

/**
 * Only the sections a story's `autoDocs` names, in the table's own order. A component
 * left with nothing to show is dropped; one that failed keeps its error (#1398).
 */
export function onlySections(entries: ComponentDocsEntry[], autoDocs: boolean | AutoDocsSection[] | undefined): ComponentDocsEntry[] {
  if (!Array.isArray(autoDocs)) {
    return entries
  }
  return entries.flatMap((entry) => {
    if (!entry.doc) {
      return [entry]
    }
    const doc = {
      ...entry.doc,
      props: autoDocs.includes('props') ? entry.doc.props : [],
      slots: autoDocs.includes('slots') ? entry.doc.slots : [],
      events: autoDocs.includes('events') ? entry.doc.events : [],
    }
    return doc.props.length || doc.slots.length || doc.events.length ? [{ ...entry, doc }] : []
  })
}

export function tagText(tags: DocTag[], name: string): string | undefined {
  const tag = tags.find(tag => tag.name === name)
  return tag ? (tag.text ?? '') : undefined
}

/** A `@see` or `@link` points somewhere only when it carries a URL. */
export function tagHref(text: string): string | undefined {
  return /https?:\/\/\S+/.exec(text)?.[0]
}

/**
 * The components a story imports, documented. In dev they are asked of the server
 * when this is first used, which is what starts extraction at all (#1159); in a
 * built book they come from what `poveste build` extracted.
 */
export function useComponentDocs(storyId: Ref<string | undefined>) {
  const components = ref<ComponentDocsEntry[]>()
  // Asked and not yet answered: the first answer can take many seconds (#1400).
  const pending = ref(false)
  const off = ref<string>()
  const hot = import.meta.hot
  if (!hot) {
    // The chunk loads on first use, and until then the tab said there were no docs (#1400).
    watch(storyId, async (id) => {
      pending.value = true
      const { componentDocs } = await import('./component-docs-data')
      const docs = id ? componentDocs[id] : undefined
      components.value = id && docs ? toEntries({ storyId: id, components: docs }) : undefined
      pending.value = false
    }, { immediate: true })
    return { components, pending, off }
  }

  function ask() {
    if (storyId.value) {
      pending.value = true
      hot!.send('poveste:docgen-request', { storyId: storyId.value })
    }
  }
  function onResult(result: StoryDocsResult) {
    if (result.storyId === storyId.value) {
      components.value = toEntries(result)
      off.value = result.off
      pending.value = false
    }
  }

  hot.on('poveste:docgen-result', onResult)
  hot.on('poveste:docgen-stale', ask)
  onBeforeUnmount(() => {
    hot.off('poveste:docgen-result', onResult)
    hot.off('poveste:docgen-stale', ask)
  })
  watch(storyId, () => {
    components.value = undefined
    off.value = undefined
    pending.value = false
    ask()
  }, { immediate: true })

  return { components, pending, off }
}
