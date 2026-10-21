// A dependency inlined as CommonJS requires another, which installs a global when
// Node first runs it. Node caches that one, so nothing installs it again (#1404).
/* global __installedOnRequire */
import './requires-installer.cjs'

const installed = __installedOnRequire

export default {
  title: 'Fourth',
  variants: [{ title: installed, onMount: () => {} }],
}
