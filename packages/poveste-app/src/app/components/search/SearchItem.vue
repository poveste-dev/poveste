<script lang="ts" setup>
import type { PropType } from 'vue'
import type { SearchResult } from '../../types'
import { ref, toRefs } from 'vue'
import { useScrollOnActive } from '../../util/scroll'
import BaseListItem from '../base/BaseListItem.vue'
import BaseListItemLink from '../base/BaseListItemLink.vue'
import SearchItemContent from './SearchItemContent.vue'

const props = defineProps({
  result: {
    type: Object as PropType<SearchResult>,
    required: true,
  },

  selected: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits({
  close: () => true,
})

const el = ref<HTMLDivElement>()

const { selected } = toRefs(props)
useScrollOnActive(selected, el)

function action() {
  if ('onActivate' in props.result) {
    props.result.onActivate()
  }
  emit('close')
}
</script>

<template>
  <div
    ref="el"
    class="poveste-search-item"
    data-test-id="search-item"
    :data-selected="selected ? '' : undefined"
  >
    <BaseListItemLink
      v-if="'route' in result"
      :to="result.route"
      :is-active="selected"
      class="px-6 py-4 gap-4"
      @navigate="action()"
    >
      <SearchItemContent
        :result="result"
        :selected="selected"
      />
    </BaseListItemLink>

    <BaseListItem
      v-if="'onActivate' in result"
      :is-active="selected"
      class="px-6 py-4 gap-4"
      @navigate="action()"
    >
      <SearchItemContent
        :result="result"
        :selected="selected"
      />
    </BaseListItem>
  </div>
</template>

<style scoped>
.bind-icon-color {
  color: v-bind('result.iconColor');
}
</style>
