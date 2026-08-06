<script lang="ts">
export default {
  name: 'HstTokenList',
}
</script>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import HstCopyIcon from '../HstCopyIcon.vue'

const props = defineProps<{
  tokens: Record<string, string | number | any[] | Record<string, any>>
  getName?: (key: string, value: string | number | any[] | Record<string, any>) => string
}>()

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

const hover = ref<string>(null)
</script>

<template>
  <div
    v-for="token of processedTokens"
    :key="token.key"
    class="poveste-token-list ptw-flex ptw-flex-col ptw-gap-2 ptw-my-8"
    @mouseenter="hover = token.key"
    @mouseleave="hover = null"
  >
    <slot
      :token="token"
    />
    <div class="ptw-mx-4">
      <div class="ptw-flex ptw-gap-1">
        <pre class="ptw-my-0 ptw-truncate ptw-shrink">{{ token.name }}</pre>
        <HstCopyIcon
          v-if="hover === token.key"
          :content="token.name"
          class="ptw-flex-none"
        />
      </div>
      <div class="ptw-flex ptw-gap-1">
        <pre class="ptw-my-0 ptw-opacity-50 ptw-truncate ptw-shrink">{{ token.value }}</pre>
        <HstCopyIcon
          v-if="hover === token.key"
          :content="typeof token.value === 'string' ? token.value : JSON.stringify(token.value)"
          class="ptw-flex-none"
        />
      </div>
    </div>
  </div>
</template>
