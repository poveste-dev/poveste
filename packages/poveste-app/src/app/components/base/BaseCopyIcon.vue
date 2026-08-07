<script lang="ts">
export default {
  name: 'HstCopyIcon',
}
</script>

<script lang="ts" setup>
import { Icon } from '@iconify/vue'
import { useClipboard } from '@vueuse/core'
import { VTooltip as vTooltip } from 'floating-vue'

const props = defineProps<{
  content: string
}>()

const { copy, copied } = useClipboard()

const action = () => copy(props.content)
</script>

<template>
  <Icon
    v-tooltip="{
      content: 'Copied!',
      triggers: [],
      shown: copied,
      distance: 12,
      delay: 0,
    }"
    icon="carbon:copy-file"
    class="poveste-base-copy-icon w-4 h-4 opacity-50 hover:opacity-100 hover:text-primary-500 cursor-pointer"
    @click="action()"
  />
</template>
