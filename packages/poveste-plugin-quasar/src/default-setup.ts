import { setupQuasar } from './setup.js'

// The setup file `HstQuasar()` supplies to a book that names none, so a `<q-btn>`
// renders rather than throwing on Quasar's missing injection (#1337).
export const setupVue3 = setupQuasar()
