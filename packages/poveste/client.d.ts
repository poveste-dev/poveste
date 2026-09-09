/**
 * @deprecated Use {@link logEvent} instead. This forwards to it and warns.
 */
export function hstEvent(name: string, argument): void

/**
 * Logs an event to the 'Events' sidepane.
 * @param name Event name
 * @param argument Additional log data displayed when inspecting the event.
 */
export function logEvent(name: string, argument): void

/**
 * Returns `true` when in the NodeJS server while collecting stories.
 */
export function isCollecting(): boolean

/**
 * Switches the book between light and dark, or to `value` when one is given.
 * Returns the mode it ended up in.
 */
export function toggleDark(value?: boolean): boolean

/**
 * Whether the book is currently in dark mode.
 */
export function isDark(): boolean
