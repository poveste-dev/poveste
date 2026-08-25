// SvelteKit i18n, like plain Svelte, needs no sandbox shim the way Nuxt's
// @nuxtjs/i18n does (#65): it's an ordinary module. Poveste mounts the story
// component directly, so no `+layout`/`load` is involved — a story passes the
// locale per call.
const messages: Record<string, Record<string, string>> = {
  en: { greeting: 'Hello' },
  fr: { greeting: 'Bonjour' },
}

export function t(key: string, locale: string): string {
  return messages[locale]?.[key] ?? key
}
