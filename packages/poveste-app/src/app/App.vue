<script lang="ts">
export default {
  name: 'PovesteApp',
}
</script>

<script lang="ts" setup>
import type { StoryFile, Tree } from './types'
import { useTitle } from '@vueuse/core'
import { onUpdate, files as rawFiles, tree as rawTree } from 'virtual:$poveste-stories'
import { computed, onMounted, ref, watch } from 'vue'
import AppActions from './components/app/AppActions.vue'
import AppHeader from './components/app/AppHeader.vue'
import Breadcrumb from './components/app/Breadcrumb.vue'
import InitialLoading from './components/app/InitialLoading.vue'
import TopBar from './components/app/TopBar.vue'
import BaseSplitPane from './components/base/BaseSplitPane.vue'
import CommandPromptsModal from './components/command/CommandPromptsModal.vue'
import LayoutModal from './components/layout/LayoutModal.vue'
import SearchModal from './components/search/SearchModal.vue'
import GenericMountStory from './components/story/GenericMountStory.vue'
import StoryList from './components/tree/StoryList.vue'
import { useCommandStore } from './stores/command'
import { useLayoutStore } from './stores/layout'
import { useStoryStore } from './stores/story'
import { povesteConfig } from './util/config'
import { toggleDark } from './util/dark'
import { onKeyboardShortcut } from './util/keyboard'
import { mapFile } from './util/mapping'
import { isMobile } from './util/responsive'

const files = ref<StoryFile[]>(rawFiles.map(file => mapFile(file)))
const tree = ref<Tree>(rawTree)

onUpdate((newFiles: StoryFile[], newTree: Tree) => {
  loading.value = false
  files.value = newFiles.map((file) => {
    const existingFile = files.value.find(f => f.id === file.id)
    return mapFile(file, existingFile)
  })
  tree.value = newTree
})

const stories = computed(() => files.value.reduce((acc, file) => {
  acc.push(file.story)
  return acc
}, []))

// Store

const storyStore = useStoryStore()
watch(stories, (value) => {
  storyStore.setStories(value)
}, {
  immediate: true,
})

useTitle(computed(() => {
  if (storyStore.currentStory) {
    let title = storyStore.currentStory.title
    if (storyStore.currentVariant) {
      title += ` › ${storyStore.currentVariant.title}`
    }
    return `${title} | ${povesteConfig.theme.title}`
  }
  return povesteConfig.theme.title
}))

const loadSearch = ref(false)
const isSearchOpen = ref(false)
const isLayoutOpen = ref(false)

watch(isSearchOpen, (value) => {
  if (value) {
    loadSearch.value = true
  }
})

onKeyboardShortcut(['ctrl+k', 'meta+k'], (event) => {
  isSearchOpen.value = true
  event.preventDefault()
})

onKeyboardShortcut(['ctrl+shift+l', 'meta+shift+l'], (event) => {
  isLayoutOpen.value = !isLayoutOpen.value
  event.preventDefault()
})

onKeyboardShortcut(['ctrl+shift+d', 'meta+shift+d'], (event) => {
  event.preventDefault()
  toggleDark()
})

const loading = ref(false)

if (import.meta.hot && !rawFiles.length) {
  loading.value = true
  import.meta.hot.on('poveste:all-stories-loaded', () => {
    loading.value = false
  })
}

const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const commandStore = useCommandStore()
const layoutStore = useLayoutStore()
</script>

<template>
  <div class="poveste-app-root h-full">
    <div
      v-if="storyStore.currentStory"
      class="poveste-app hidden"
    >
      <GenericMountStory
        :key="storyStore.currentStory.id"
        :story="storyStore.currentStory"
      />
    </div>

    <div
      class="h-screen bg-gray-100 dark:bg-gray-750 dark:text-gray-100"
      :style="{
        // Prevent flash of content
        opacity: mounted ? 1 : 0,
      }"
    >
      <div
        v-if="isMobile"
        class="h-full flex flex-col divide-y divide-gray-100 dark:divide-gray-800"
      >
        <div class="flex items-center gap-2 pr-4">
          <AppHeader class="flex-1" />
          <AppActions
            class="flex-none"
            @layout="isLayoutOpen = true"
            @search="isSearchOpen = true"
          />
        </div>
        <Breadcrumb
          :tree="tree"
          :stories="stories"
        />
        <RouterView class="grow" />
      </div>

      <BaseSplitPane
        v-else-if="layoutStore.settings.storyListVisible"
        save-id="main-horiz"
        :min="5"
        :max="50"
        :default-split="15"
        class="h-full"
      >
        <template #first>
          <div class="flex flex-col h-full bg-gray-100 dark:bg-gray-750 __poveste-pane-shadow-from-right">
            <AppHeader class="flex-none" />
            <StoryList
              :tree="tree"
              :stories="stories"
              class="flex-1"
            />
          </div>
        </template>

        <template #last>
          <div class="flex flex-col h-full">
            <TopBar
              @layout="isLayoutOpen = true"
              @search="isSearchOpen = true"
            />
            <RouterView class="flex-1 min-h-0" />
          </div>
        </template>
      </BaseSplitPane>
      <div
        v-else
        class="h-full flex flex-col"
      >
        <TopBar
          @layout="isLayoutOpen = true"
          @search="isSearchOpen = true"
        />
        <RouterView class="flex-1 min-h-0" />
      </div>

      <LayoutModal
        v-if="!isMobile"
        :shown="isLayoutOpen"
        @close="isLayoutOpen = false"
      />

      <SearchModal
        v-if="loadSearch"
        :shown="isSearchOpen"
        @close="isSearchOpen = false"
      />

      <CommandPromptsModal
        v-if="__POVESTE_DEV__"
        :shown="commandStore.showPromptsModal"
        @close="commandStore.showPromptsModal = false"
      />
    </div>

    <transition name="__poveste-fade">
      <InitialLoading
        v-if="loading"
      />
    </transition>
  </div>
</template>
