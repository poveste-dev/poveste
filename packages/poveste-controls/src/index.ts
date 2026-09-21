import { defineAsyncComponent } from 'vue'
import HstButtonVue from './components/button/HstButton.vue'
import HstButtonGroupVue from './components/button/HstButtonGroup.vue'
import HstCheckboxVue from './components/checkbox/HstCheckbox.vue'
import HstCheckboxListVue from './components/checkbox/HstCheckboxList.vue'
import HstColorSelectVue from './components/colorselect/HstColorSelect.vue'
import HstColorShadesVue from './components/design-tokens/HstColorShades.vue'
import HstTokenGridVue from './components/design-tokens/HstTokenGrid.vue'
import HstTokenListVue from './components/design-tokens/HstTokenList.vue'
import HstCopyIconVue from './components/HstCopyIcon.vue'
import HstTooltipVue from './components/HstTooltip.vue'
import HstNumberVue from './components/number/HstNumber.vue'
import HstRadioVue from './components/radio/HstRadio.vue'
import HstSelectVue from './components/select/HstSelect.vue'
import HstSliderVue from './components/slider/HstSlider.vue'
import HstTextVue from './components/text/HstText.vue'
import HstTextareaVue from './components/textarea/HstTextarea.vue'

export const HstButton = HstButtonVue
export const HstButtonGroup = HstButtonGroupVue
export const HstCheckbox = HstCheckboxVue
export const HstCheckboxList = HstCheckboxListVue
export const HstText = HstTextVue
export const HstNumber = HstNumberVue
export const HstSlider = HstSliderVue
export const HstTextarea = HstTextareaVue
export const HstSelect = HstSelectVue
export const HstColorShades = HstColorShadesVue
export const HstTokenList = HstTokenListVue
export const HstTokenGrid = HstTokenGridVue
export const HstCopyIcon = HstCopyIconVue
/**
 * Public because `@poveste/app` uses it too: one wrapper for the whole chrome
 * rather than one per package, which is what floating-vue's single theme was.
 *
 * Deliberately absent from `components` below. That list is the controls a story
 * book registers globally and the Svelte bridge mirrors as `Hst.*`; a tooltip is
 * not a control and has no state to bind.
 */
export const HstTooltip = HstTooltipVue
export const HstRadio = HstRadioVue
/**
 * The three controls a book pays for only when it uses one.
 *
 * `HstJson` is a CodeMirror editor — 430 KB of this package's 460 (#374).
 * `HstDate` and `HstColor` are Reka's date and colour stacks, 215 KB and 101 KB
 * of a built book, and a book with no date in it was downloading both.
 *
 * Needs `inlineDynamicImports: false` in the build config to mean anything: a
 * single-entry lib build flattens dynamic imports back into one file.
 *
 * Nothing renders until the chunk arrives — no spinner, no reserved box. That is
 * what `HstJson` has always done, and a controls panel is already laid out one
 * row at a time, so a row appearing is the same motion as a row of a longer
 * panel arriving.
 *
 * `name` and `emits` are put back on each wrapper, which carries neither.
 * `@poveste/plugin-svelte`'s Wrap.svelte reads both: it builds its Vue listeners
 * by iterating `controlComponent.emits`, so without this the control renders and
 * edits in a Svelte book and never writes back. `index.spec.ts` pins them against
 * the real components so these copies cannot drift.
 */
export const HstJson = Object.assign(
  defineAsyncComponent(() => import('./components/json/HstJson.vue')),
  { name: 'HstJson', emits: ['update:modelValue'] },
)
export const HstDate = Object.assign(
  defineAsyncComponent(() => import('./components/date/HstDate.vue')),
  { name: 'HstDate', emits: ['update:modelValue'] },
)
export const HstColor = Object.assign(
  defineAsyncComponent(() => import('./components/color/HstColor.vue')),
  { name: 'HstColor', emits: ['update:modelValue'] },
)
export const HstColorSelect = HstColorSelectVue

export const components = {
  HstButton,
  HstButtonGroup,
  HstCheckbox,
  HstCheckboxList,
  HstText,
  HstNumber,
  HstSlider,
  HstTextarea,
  HstSelect,
  HstRadio,
  HstColor,
  HstDate,
  HstJson,
  HstColorShades,
  HstTokenList,
  HstTokenGrid,
  HstCopyIcon,
  HstColorSelect,
}

export * from './types.js'
