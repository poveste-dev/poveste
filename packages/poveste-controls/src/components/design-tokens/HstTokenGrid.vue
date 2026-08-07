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
    class="poveste-token-grid bind-col-size grid gap-4 m-4"
    :style="{
      '--poveste-col-size': colSizePx,
    }"
  >
    <div
      v-for="token of processedTokens"
      :key="token.key"
      class="flex flex-col gap-2"
      @mouseenter="hover = token.key"
      @mouseleave="hover = null"
    >
      <slot
        :token="token"
      />
      <div>
        <div class="flex gap-1">
          <pre
            v-tooltip="token.name.length > colSize / 8 ? token.name : ''"
            class="my-0 truncate shrink"
          >{{ token.name }}</pre>
          <HstCopyIcon
            v-if="hover === token.key"
            :content="token.name"
            class="flex-none"
          />
        </div>
        <div class="flex gap-1">
          <pre
            v-tooltip="token.value.length > colSize / 8 ? token.value : ''"
            class="my-0 opacity-50 truncate shrink"
          >{{ token.value }}</pre>
          <HstCopyIcon
            v-if="hover === token.key"
            :content="typeof token.value === 'string' ? token.value : JSON.stringify(token.value)"
            class="flex-none"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.bind-col-size {
  grid-template-columns: repeat(auto-fill, minmax(var(--poveste-col-size), 1fr));
}
</style>
