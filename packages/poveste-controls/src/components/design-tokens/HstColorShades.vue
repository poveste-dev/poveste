<script lang="ts">
export default {
  name: 'HstColorShades',
}
</script>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import { VTooltip as vTooltip } from 'floating-vue'
import { computed, ref } from 'vue'
import HstCopyIcon from '../HstCopyIcon.vue'

const props = defineProps<{
  shades: Record<string, any>
  getName?: (key: string, color: string) => string
  search?: string
}>()

function flattenShades(shades: Record<string, any>, path = ''): Record<string, string> {
  return Object.entries(shades).reduce((acc, [key, color]) => {
    const nextPath = path ? key === 'DEFAULT' ? path : `${path}-${key}` : key
    const obj = typeof color === 'object' ? flattenShades(color, nextPath) : { [nextPath]: color }
    return { ...acc, ...obj }
  }, {})
}

const shadesWithName = computed(() => {
  const shades = props.shades
  const getName = props.getName
  const flatShades = flattenShades(shades)
  return Object.entries(flatShades).map(([key, color]) => {
    const name = getName ? getName(key, color) : key
    return {
      key,
      color,
      name,
    }
  })
})

const displayedShades = computed(() => {
  let list = shadesWithName.value
  if (props.search) {
    const reg = new RegExp(props.search, 'i')
    list = list.filter(({ name }) => reg.test(name))
  }
  return list
})

const hover = ref<string>(null)
</script>

<template>
  <div
    v-if="displayedShades.length"
    class="poveste-color-shades ptw-grid ptw-gap-4 ptw-grid-cols-[repeat(auto-fill,minmax(200px,1fr))] ptw-m-4"
  >
    <div
      v-for="shade of displayedShades"
      :key="shade.key"
      class="ptw-flex ptw-flex-col ptw-gap-2"
      @mouseenter="hover = shade.key"
      @mouseleave="hover = null"
    >
      <slot
        :color="shade.color"
      >
        <div
          class="ptw-rounded-full ptw-w-16 ptw-h-16"
          :style="{
            backgroundColor: shade.color,
          } as CSSProperties"
        />
      </slot>
      <div>
        <div class="ptw-flex ptw-gap-1">
          <pre
            v-tooltip="shade.name.length > 23 ? shade.name : ''"
            class="ptw-my-0 ptw-truncate ptw-shrink"
          >{{ shade.name }}</pre>
          <HstCopyIcon
            v-if="hover === shade.key"
            :content="shade.name"
            class="ptw-flex-none"
          />
        </div>
        <div class="ptw-flex ptw-gap-1">
          <pre
            v-tooltip="shade.color.length > 23 ? shade.color : ''"
            class="ptw-my-0 ptw-opacity-50 ptw-truncate ptw-shrink"
          >{{ shade.color }}</pre>
          <HstCopyIcon
            v-if="hover === shade.key"
            :content="shade.color"
            class="ptw-flex-none"
          />
        </div>
      </div>
    </div>
  </div>
</template>
