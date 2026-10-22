<script lang="ts">
export default {
  name: 'HstColorShades',
}
</script>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import { computed, ref } from 'vue'
import HstCopyIcon from '../HstCopyIcon.vue'
import HstTooltip from '../HstTooltip.vue'

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

const hover = ref<string | null>(null)
</script>

<template>
  <div
    v-if="displayedShades.length"
    class="poveste-color-shades"
    data-slot="shades"
  >
    <div
      v-for="shade of displayedShades"
      :key="shade.key"
      class="poveste-token-item"
      @mouseenter="hover = shade.key"
      @mouseleave="hover = null"
    >
      <slot
        :color="shade.color"
      >
        <div
          class="poveste-color-shades-swatch"
          data-slot="swatch"
          :style="{
            backgroundColor: shade.color,
          } as CSSProperties"
        />
      </slot>
      <div>
        <div class="poveste-token-row">
          <HstTooltip :content="shade.name.length > 23 ? shade.name : ''">
            <pre class="poveste-token-text" data-slot="name">{{ shade.name }}</pre>
          </HstTooltip>
          <HstCopyIcon
            v-if="hover === shade.key"
            :content="shade.name"
            class="poveste-token-copy"
          />
        </div>
        <div class="poveste-token-row">
          <HstTooltip :content="shade.color.length > 23 ? shade.color : ''">
            <pre class="poveste-token-text" data-slot="value">{{ shade.color }}</pre>
          </HstTooltip>
          <HstCopyIcon
            v-if="hover === shade.key"
            :content="shade.color"
            class="poveste-token-copy"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="postcss">
.poveste-color-shades {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem;
}

.poveste-color-shades-swatch {
  width: 4rem;
  height: 4rem;
  border-radius: 9999px;
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
