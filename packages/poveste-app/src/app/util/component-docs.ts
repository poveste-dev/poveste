import type { ComponentDoc, DocTag } from '@poveste/shared'
import type { Ref } from 'vue'
import { onBeforeUnmount, ref, watch } from 'vue'

export interface ComponentDocsEntry {
  /** Relative to the book's root. */
  file: string
  /** The file name without its extension. */
  name: string
  doc?: ComponentDoc
  error?: string
}

interface StoryDocsResult {
  storyId: string
  components: Record<string, { doc?: ComponentDoc, error?: string }>
}

export function toEntries(result: StoryDocsResult): ComponentDocsEntry[] {
  return Object.entries(result.components).map(([file, { doc, error }]) => ({
    file,
    name: file.split('/').pop()!.replace(/\.[^.]+$/, ''),
    ...doc ? { doc } : {},
    ...error ? { error } : {},
  }))
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
  const hot = import.meta.hot
  if (!hot) {
    watch(storyId, async (id) => {
      const { componentDocs } = await import('./component-docs-data')
      const docs = id ? componentDocs[id] : undefined
      components.value = id && docs ? toEntries({ storyId: id, components: docs }) : undefined
    }, { immediate: true })
    return { components }
  }

  function ask() {
    if (storyId.value) {
      hot!.send('poveste:docgen-request', { storyId: storyId.value })
    }
  }
  function onResult(result: StoryDocsResult) {
    if (result.storyId === storyId.value) {
      components.value = toEntries(result)
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
    ask()
  }, { immediate: true })

  return { components }
}
