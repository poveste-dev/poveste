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
    class="poveste-color"
    data-slot="control"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <span
      class="poveste-color-row"
      data-slot="row"
    >
      <PopoverRoot v-model:open="open">
        <PopoverTrigger as-child>
          <button
            type="button"
            class="poveste-color-swatch"
            data-slot="swatch"
            aria-label="Open the colour picker"
          >
            <ColorSwatch
              :color="modelValue || FALLBACK"
              class="poveste-color-swatch-fill"
              data-slot="preview"
            />
          </button>
        </PopoverTrigger>

        <PopoverPortal
          v-if="target"
          :to="target"
        >
          <PopoverContent
            class="poveste-color-picker"
            data-slot="picker"
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
              data-slot="area"
              @update:color="write"
            >
              <ColorAreaArea class="poveste-color-area-surface">
                <ColorAreaThumb class="poveste-color-thumb" />
              </ColorAreaArea>
            </ColorAreaRoot>

            <ColorSliderRoot
              :model-value="picked"
              color-space="hsb"
              channel="hue"
              orientation="horizontal"
              class="poveste-color-hue"
              data-slot="hue"
              @update:color="write"
            >
              <ColorSliderTrack class="poveste-color-hue-track">
                <ColorSliderThumb class="poveste-color-thumb" />
              </ColorSliderTrack>
            </ColorSliderRoot>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>

      <ColorFieldRoot
        :model-value="modelValue || FALLBACK"
        class="poveste-color-field-root"
        @update:color="write"
      >
        <ColorFieldInput
          class="poveste-color-field"
          data-slot="field"
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
.poveste-color {
  align-items: center;
}

.poveste-color-row {
  display: flex;
  align-items: center;
  gap: .5rem;
  width: 100%;
}

.poveste-color-swatch {
  box-sizing: border-box;
  flex: none;
  width: 27px;
  height: 27px;
  padding: .125rem;
  margin-block: -.25rem;
  border: 1px solid rgb(0 0 0 / .25);
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;

  /* Spelled out on the subject: `.ptw-dark` sits above the `@scope` root, so a
     descendant rule keyed on it never matches from in here (#101). */
  &:where(.ptw-dark, .ptw-dark *) {
    border-color: rgb(255 255 255 / .25);
  }

  &:hover {
    border-color: var(--color-primary-500);
  }
}

.poveste-color-swatch-fill {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-sm);
}

.poveste-color-field-root {
  flex-grow: 1;
}

.poveste-color-field {
  box-sizing: border-box;
  width: 100%;
  padding: .25rem .5rem;
  margin-block: -.25rem;
  border: 1px solid rgb(0 0 0 / .25);
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  outline: none;

  &:where(.ptw-dark, .ptw-dark *) {
    border-color: rgb(255 255 255 / .25);
  }

  &:focus {
    border-color: var(--color-primary-500);
  }
}

.poveste-color-picker {
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: .5rem;
  padding: .5rem;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  background: var(--color-gray-50);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1);

  &:where(.ptw-dark, .ptw-dark *) {
    border-color: var(--color-gray-850);
    background: var(--color-gray-700);
  }
}

.poveste-color-area {
  width: 10rem;
  height: 8rem;
}

.poveste-color-area-surface {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-sm);
}

.poveste-color-hue {
  width: 10rem;
  height: .75rem;
}

.poveste-color-hue-track {
  width: 100%;
  height: 100%;
  border-radius: 9999px;
}

.poveste-color-thumb {
  width: .75rem;
  height: .75rem;
  border: 2px solid var(--color-white);
  border-radius: 9999px;

  /* A ring rather than a token: this separates the thumb from whatever colour is
     under it, which is every colour, so no palette value is the right one. */
  box-shadow: 0 0 0 1px rgb(0 0 0 / .5);
}
</style>
