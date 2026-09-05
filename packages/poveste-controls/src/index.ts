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
export const HstRadio = HstRadioVue
/**
 * Lazy because it is a CodeMirror editor — 430 KB of this package's 460 (#374).
 * Needs `inlineDynamicImports: false` in the build config to mean anything: a
 * single-entry lib build flattens dynamic imports back into one file.
 */
// `name` and `emits` are put back on the wrapper, which carries neither.
// `@poveste/plugin-svelte`'s Wrap.svelte reads both: it builds its Vue
// listeners by iterating `controlComponent.emits`, so without this the JSON
// control renders and edits in a Svelte book and never writes back. `index.spec.ts`
// pins them against the real component so this copy cannot drift.
export const HstJson = Object.assign(
  defineAsyncComponent(() => import('./components/json/HstJson.vue')),
  { name: 'HstJson', emits: ['update:modelValue'] },
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
  HstJson,
  HstColorShades,
  HstTokenList,
  HstTokenGrid,
  HstCopyIcon,
  HstColorSelect,
}

export * from './types'
