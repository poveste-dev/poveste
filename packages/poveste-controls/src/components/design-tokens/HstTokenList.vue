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

const hover = ref<string | null>(null)
</script>

<template>
  <div
    v-for="token of processedTokens"
    :key="token.key"
    class="poveste-token-list"
    data-slot="token"
    @mouseenter="hover = token.key"
    @mouseleave="hover = null"
  >
    <slot
      :token="token"
    />
    <div class="poveste-token-list-labels">
      <div class="poveste-token-row">
        <pre class="poveste-token-text" data-slot="name">{{ token.name }}</pre>
        <HstCopyIcon
          v-if="hover === token.key"
          :content="token.name"
          class="poveste-token-copy"
        />
      </div>
      <div class="poveste-token-row">
        <pre class="poveste-token-text" data-slot="value">{{ token.value }}</pre>
        <HstCopyIcon
          v-if="hover === token.key"
          :content="typeof token.value === 'string' ? token.value : JSON.stringify(token.value)"
          class="poveste-token-copy"
        />
      </div>
    </div>
  </div>
</template>

<style lang="postcss">
.poveste-token-list {
  display: flex;
  flex-direction: column;
  gap: .5rem;
  margin-block: 2rem;
}

.poveste-token-list-labels {
  margin-inline: 1rem;
}

.poveste-token-item {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}

.poveste-token-row {
  display: flex;
  gap: .25rem;
}

.poveste-token-text {
  flex-shrink: 1;
  margin-block: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  &[data-slot='value'] {
    opacity: .5;
  }
}

.poveste-token-copy {
  flex: none;
}
</style>
