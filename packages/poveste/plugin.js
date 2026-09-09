export function sendEvent(event, payload) {
  if (window.__HST_PLUGIN_API__) {
    return window.__HST_PLUGIN_API__.sendEvent(event, payload)
  }
  // The dev server installs that API and a built book has no plugin host, so
  // this is the ordinary path there. Resolve rather than fall off the end: the
  // signature promises a `Promise`, and returning `undefined` meant
  // `sendEvent(...).then(...)` threw in a built book while `await` was fine.
  return Promise.resolve(undefined)
}

export function openStory(storyId) {
  if (window.__HST_PLUGIN_API__) {
    return window.__HST_PLUGIN_API__.openStory(storyId)
  }
}
