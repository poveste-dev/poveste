// `navigator.platform` is deprecated with no cross-browser replacement:
// `navigator.userAgentData` is Chromium-only, so reading it here would simply
// stop detecting macOS in Safari and Firefox — the two places where getting the
// ⌘ shortcuts right matters most.
// eslint-disable-next-line ts/no-deprecated
export const isMac = navigator.platform.toLowerCase().includes('mac')
