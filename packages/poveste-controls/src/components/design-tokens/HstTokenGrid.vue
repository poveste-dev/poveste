<script lang="ts">
export default {
  name: 'HstTokenGrid',
}
</script>

<script lang="ts" setup>
import { VTooltip as vTooltip } from 'floating-vue'
import { computed, ref } from 'vue'
import HstCopyIcon from '../HstCopyIcon.vue'

const props = withDefaults(defineProps<{
  tokens: Record<string, string | number | any[] | Record<string, any>>
  colSize?: number
  getName?: (key: string, value: string | number | any[] | Record<string, any>) => string
}>(), {
  colSize: 180,
  getName: null,
})

const processedTokens = computed(() => {
  const list = props.tokens
  const getName = props.getName
  return Object.entries(list).map(([key, value]) => {
    const name = getName ? getName(key, value) : key
    return {
      key,
      name,
      value: typeof value === 'number' ? value.toString() : value,
    }
  })
})

const colSizePx = computed(() => `${props.colSize}px`)

const hover = ref<string>(null)
</script>

<template>
  <div
    class="poveste-token-grid ptw-bind-col-size ptw-grid ptw-gap-4 ptw-m-4"
    :style="{
      '--poveste-col-size': colSizePx,
    }"
  >
    <div
      v-for="token of processedTokens"
      :key="token.key"
      class="ptw-flex ptw-flex-col ptw-gap-2"
      @mouseenter="hover = token.key"
      @mouseleave="hover = null"
    >
      <slot
        :token="token"
      />
      <div>
        <div class="ptw-flex ptw-gap-1">
          <pre
            v-tooltip="token.name.length > colSize / 8 ? token.name : ''"
            class="ptw-my-0 ptw-truncate ptw-shrink"
          >{{ token.name }}</pre>
          <HstCopyIcon
            v-if="hover === token.key"
            :content="token.name"
            class="ptw-flex-none"
          />
        </div>
        <div class="ptw-flex ptw-gap-1">
          <pre
            v-tooltip="token.value.length > colSize / 8 ? token.value : ''"
            class="ptw-my-0 ptw-opacity-50 ptw-truncate ptw-shrink"
          >{{ token.value }}</pre>
          <HstCopyIcon
            v-if="hover === token.key"
            :content="typeof token.value === 'string' ? token.value : JSON.stringify(token.value)"
            class="ptw-flex-none"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.ptw-bind-col-size {
  grid-template-columns: repeat(auto-fill, minmax(var(--poveste-col-size), 1fr));
}
</style>
