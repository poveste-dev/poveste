import { readLabel } from './helper.js'

export default {
  id: 'button',
  title: 'Button',
  variants: [{ title: 'Default', onMount: () => readLabel }],
}
