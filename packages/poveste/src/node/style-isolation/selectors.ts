// Centralised CSS scope-root class names used by the style-isolation
// pipeline. Keep in sync with the runtime markers applied in
// poveste-app (App.vue's `poveste-app-root` wrapper, GenericRenderStory's
// `__poveste-render-story` class, sandbox.ts's body class).

export const APP_SCOPE_ROOT = '.poveste-app-root'
export const STORY_SCOPE_ROOT = '.__poveste-render-story'
// Custom-controls panels carry both classes (.__poveste-render-story and
// .__poveste-render-custom-controls) but render inside the chrome panel,
// so the @scope boundary must keep them in chrome scope.
export const STORY_SCOPE_BOUNDARY = '.__poveste-render-story:not(.__poveste-render-custom-controls)'
export const DEFAULTS_LAYER = 'poveste-defaults'
export const USER_GLOBALS_LAYER = 'poveste-user-globals'
// Import query `globalStyles` files carry so the user-CSS plugin leaves them
// alone — they belong in the chrome page, not inside the story scope.
export const GLOBAL_LAYER_QUERY = 'poveste-global-layer'
