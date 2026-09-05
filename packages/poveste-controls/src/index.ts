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
 * Loaded on demand: it is a CodeMirror editor, and it is the only one.
 *
 * CodeMirror and lezer are 430 KB of the 460 KB this package builds to — 93% of
 * a control library, for one control — and every book carried it whether or not
 * a story ever rendered a JSON control (#374). A dynamic import puts it in its
 * own chunk, fetched when one actually mounts.
 *
 * `inlineDynamicImports` is off in the build config for this to mean anything:
 * a single-entry lib build flattens dynamic imports back into one file by
 * default, and then there is no boundary left for a book's bundler to split on.
 */
export const HstJson = defineAsyncComponent(() => import('./components/json/HstJson.vue'))
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
