/**
 * Sends a custom event from the book UI to the plugin's `onDevEvent` hook, and
 * resolves with whatever that hook returns.
 *
 * Development only: the API it calls is installed by the dev server, so in a
 * built book this resolves to `undefined` without erroring.
 */
export function sendEvent(event: string, payload?: any): Promise<any>

/**
 * Navigates the book to a story by its `id` — the same field `getStories()`
 * returns on the plugin API. Development only, and a no-op in a built book.
 */
export function openStory(storyId: string): void
