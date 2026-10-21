import { sizes } from './sizes.js'

export default {
  title: 'Sizes',
  variants: sizes.map(size => ({ title: size, onMount: () => {} })),
}
