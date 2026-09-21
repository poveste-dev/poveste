<script lang="ts">
export default {
  name: 'HstColor',
}
</script>

<script lang="ts" setup>
import type { Color } from 'reka-ui'
import {
  ColorAreaArea,
  ColorAreaRoot,
  ColorAreaThumb,
  ColorFieldInput,
  ColorFieldRoot,
  ColorSliderRoot,
  ColorSliderThumb,
  ColorSliderTrack,
  ColorSwatch,
  colorToHex,
  convertToHsb,
  normalizeColor,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'
import { onMounted, ref, shallowRef, watch } from 'vue'
import { portalTarget } from '../../portal-target'
import HstWrapper from '../HstWrapper.vue'

const props = withDefaults(defineProps<{
  title?: string | undefined
  /** A hex string — `#3366ff`. */
  modelValue?: string | null | undefined
}>(), {
  title: undefined,
  modelValue: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const open = ref(false)

// After mount, not during setup: the chrome's root is only in the document once
// the tree it wraps has been inserted.
const target = shallowRef<HTMLElement>()
onMounted(() => {
  target.value = portalTarget()
})

const FALLBACK = '#000000'

function hsbOf(value: string | Color | null | undefined): Color {
  return convertToHsb(normalizeColor(value || FALLBACK))
}

/**
 * The colour the picker is editing, in HSB, held rather than read back out of
 * the value on every change. Two separate reasons, both of which end as a drag
 * that does not come back where it started.
 *
 * Held, because a hex string is three channels and this picker edits four.
 * `#000000` is every hue and every saturation at once and any grey is every hue,
 * so rebuilding the picker from the hex threw away whichever of them the colour
 * had stopped expressing — and one drag to the bottom of the area stops
 * expressing two. The story keeps the hex, which is what has to survive the trip
 * into a sandbox; the rest lives here while the control is on screen.
 *
 * HSB, because `getChannelValue` reads the channel off whatever space the object
 * is already in rather than converting to the one the area declares: asked for
 * `saturation`, an RGB colour answers HSL's 100 where the HSB the area is
 * plotting says 80. The area then writes that 100 back into an HSB colour, and
 * the first keystroke moves a channel nobody touched.
 */
const picked = shallowRef<Color>(hsbOf(props.modelValue))

// A value set from outside still wins. Compared as hex rather than by identity,
// because what arrives is this component's own emit nine times in ten, and
// re-seeding on that is the first paragraph above.
watch(() => props.modelValue, (value) => {
  const next = hsbOf(value)
  if (colorToHex(next) !== colorToHex(picked.value)) {
    picked.value = next
  }
})

/**
 * Bound to `update:color` rather than `update:modelValue`: the area, the slider
 * and the field all offer both, and only that one hands over the `Color`.
 */
function write(value: Color) {
  picked.value = convertToHsb(value)
  emit('update:modelValue', colorToHex(value))
}
</script>

<template>
  <!-- A div, not the wrapper's default label: a click anywhere in a label moves
       focus to the first labelable element inside it, which here is a hidden
       input rather than the swatch or the field that was clicked. -->
  <HstWrapper
    tag="div"
    :title="title"
    class="poveste-color items-center"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <span class="flex gap-2 items-center w-full">
      <PopoverRoot v-model:open="open">
        <PopoverTrigger as-child>
          <button
            type="button"
            class="poveste-color-swatch"
            aria-label="Open the colour picker"
          >
            <ColorSwatch
              :color="modelValue || FALLBACK"
              class="w-full h-full rounded-sm"
            />
          </button>
        </PopoverTrigger>

        <PopoverPortal
          v-if="target"
          :to="target"
        >
          <PopoverContent
            class="poveste-color-picker"
            align="start"
            :side-offset="6"
            :collision-padding="8"
          >
            <!-- HSB, not the `rgb` default: that one puts red on x and green on y,
                 so the area and a hue slider disagree about what they are editing. -->
            <ColorAreaRoot
              :model-value="picked"
              color-space="hsb"
              x-channel="saturation"
              y-channel="brightness"
              class="poveste-color-area"
              @update:color="write"
            >
              <ColorAreaArea class="w-full h-full rounded-sm">
                <ColorAreaThumb class="poveste-color-thumb" />
              </ColorAreaArea>
            </ColorAreaRoot>

            <ColorSliderRoot
              :model-value="picked"
              color-space="hsb"
              channel="hue"
              orientation="horizontal"
              class="poveste-color-hue"
              @update:color="write"
            >
              <ColorSliderTrack class="w-full h-full rounded-full">
                <ColorSliderThumb class="poveste-color-thumb" />
              </ColorSliderTrack>
            </ColorSliderRoot>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>

      <ColorFieldRoot
        :model-value="modelValue || FALLBACK"
        class="grow"
        @update:color="write"
      >
        <ColorFieldInput
          class="poveste-color-field"
          aria-label="Colour"
        />
      </ColorFieldRoot>
    </span>

    <template #actions>
      <slot name="actions" />
    </template>
  </HstWrapper>
</template>

<style lang="postcss">
@reference "../../style/main.css";

.poveste-color-swatch {
  @apply w-[27px] h-[27px] -my-1 flex-none p-0.5 rounded-sm cursor-pointer bg-transparent border border-solid border-black/25 dark:border-white/25 hover:border-primary-500 dark:hover:border-primary-500;
}

.poveste-color-field {
  @apply text-inherit bg-transparent w-full outline-none px-2 py-1 -my-1 border border-solid border-black/25 dark:border-white/25 focus:border-primary-500 dark:focus:border-primary-500 rounded-sm;
}

.poveste-color-picker {
  @apply flex flex-col gap-2 p-2 bg-gray-50 dark:bg-gray-700 border border-solid border-gray-200 dark:border-gray-850 rounded-sm shadow-md;

  z-index: 100;
}

.poveste-color-area {
  @apply w-40 h-32;
}

.poveste-color-hue {
  @apply w-40 h-3;
}

.poveste-color-thumb {
  @apply w-3 h-3 rounded-full border-2 border-solid border-white;

  box-shadow: 0 0 0 1px rgb(0 0 0 / .5);
}
</style>
