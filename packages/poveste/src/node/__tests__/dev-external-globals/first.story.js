// A dependency that installs a global when it is first imported, as Vue's
// development build does with `__VUE_HMR_RUNTIME__`. A `data:` import is
// externalised, so Node runs it once and caches it.
/* global __installedOnImport */
import 'data:text/javascript,globalThis.__installedOnImport = "installed"'

const installed = __installedOnImport

export default {
  title: 'First',
  variants: [{ title: installed, onMount: () => {} }],
}
