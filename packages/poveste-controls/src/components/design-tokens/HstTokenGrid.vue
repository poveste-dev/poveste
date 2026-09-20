<script lang="ts">
export default {
  name: 'HstTokenGrid',
}
</script>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import HstCopyIcon from '../HstCopyIcon.vue'
import HstTooltip from '../HstTooltip.vue'

const props = withDefaults(defineProps<{
  tokens: Record<string, string | number | any[] | Record<string, any>>
  colSize?: number
  getName?: (key: string, value: string | number | any[] | Record<string, any>) => string
}>(), {
  colSize: 180,
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

const hover = ref<string | null>(null)

/**
 * The value, when the column is too narrow to show it whole.
 *
 * `length` on the raw value rather than on its rendered form, which is the test
 * this carried before the tooltips moved to a component: a record has no
 * `length` and so never had a tooltip here.
 */
function truncatedValue(value: string | any[] | Record<string, any>, width: number): string {
  if (typeof value !== 'string' && !Array.isArray(value)) {
    return ''
  }
  return value.length > width ? String(value) : ''
}
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
          <HstTooltip :content="token.name.length > colSize / 8 ? token.name : ''">
            <pre class="my-0 truncate shrink">{{ token.name }}</pre>
          </HstTooltip>
          <HstCopyIcon
            v-if="hover === token.key"
            :content="token.name"
            class="flex-none"
          />
        </div>
        <div class="flex gap-1">
          <HstTooltip :content="truncatedValue(token.value, colSize / 8)">
            <pre class="my-0 opacity-50 truncate shrink">{{ token.value }}</pre>
          </HstTooltip>
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
