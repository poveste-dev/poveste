// The Svelte counterpart to the Nuxt i18n story (#65). The point it makes: Svelte
// i18n needs no sandbox shim, because it is an ordinary module — not a framework
// plugin booted through an app entry the way @nuxtjs/i18n is. A real app would
// drive `locale` from a store; a story passes it per call.
const messages: Record<string, Record<string, string>> = {
  en: { greeting: 'Hello' },
  fr: { greeting: 'Bonjour' },
}

export function t(key: string, locale: string): string {
  return messages[locale]?.[key] ?? key
}
