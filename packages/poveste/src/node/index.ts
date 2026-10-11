// A plugin that generates story source needs to reference poveste's own
// vendored copies of Vue and the controls from inside that generated code.
export { onPovesteCleanup } from './cleanup.js'
export { defaultColors } from './colors.js'
// Named, not `export *`: an `export` added to config.ts so a spec can reach a
// helper would otherwise publish it (#1291).
export {
  configFileNames,
  defineConfig,
  getDefaultConfig,
  loadConfigFile,
  mergeBuildConfig,
  mergeConfig,
  processConfig,
  resolveConfig,
  resolveConfigFile,
} from './config.js'
export * from './plugin.js'
export { getInjectedImport } from './util/vendors.js'
export * from '@poveste/shared'
