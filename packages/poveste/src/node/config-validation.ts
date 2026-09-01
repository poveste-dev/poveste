/**
 * Type checks over the config options that are load-bearing.
 *
 * Nothing validated the config, so a wrong type surfaced wherever the value was
 * first used — `outDir: 42` became `TypeError: input.replace is not a function`
 * inside `pathe`, naming neither Poveste, nor the option, nor the config file
 * (#324).
 *
 * Hand-written rather than a schema library: `poveste` already ships 31 runtime
 * dependencies (#306), and this needs to name a key and a received type, not
 * model the whole surface. Only options whose wrong type fails *inside someone
 * else's code* are listed — the rest fail legibly on their own.
 */
export type ConfigKind = 'string' | 'boolean' | 'number' | 'string[]' | 'array' | 'object' | 'function'

interface Rule {
  path: string
  kind: ConfigKind | ConfigKind[]
}

const RULES: Rule[] = [
  { path: 'outDir', kind: 'string' },
  { path: 'storyMatch', kind: 'string[]' },
  { path: 'storyIgnored', kind: 'string[]' },
  { path: 'plugins', kind: 'array' },
  { path: 'setupFile', kind: ['string', 'object'] },
  { path: 'setupCode', kind: 'string[]' },
  { path: 'globalStyles', kind: 'string[]' },
  { path: 'isolateStyles', kind: 'boolean' },
  { path: 'autoApplyContrastColor', kind: 'boolean' },
  { path: 'defaultBackgroundColor', kind: 'string' },
  { path: 'sandboxDarkClass', kind: 'string' },
  { path: 'responsivePresets', kind: 'array' },
  { path: 'backgroundPresets', kind: 'array' },
  { path: 'theme.title', kind: 'string' },
  { path: 'theme.lang', kind: 'string' },
  { path: 'theme.darkClass', kind: 'string' },
  { path: 'theme.favicon', kind: 'string' },
  { path: 'theme.logo.square', kind: 'string' },
  { path: 'theme.logo.light', kind: 'string' },
  { path: 'theme.logo.dark', kind: 'string' },
  { path: 'theme.logoHref', kind: 'string' },
  { path: 'tree.file', kind: ['string', 'function'] },
  { path: 'tree.order', kind: ['string', 'function'] },
  { path: 'vite', kind: ['object', 'function'] },
]

/** What the value actually is, in the words the message uses. */
export function describeKind(value: unknown): string {
  if (Array.isArray(value)) {
    return value.every(item => typeof item === 'string') ? 'string[]' : 'array'
  }
  return typeof value
}

function matches(value: unknown, kind: ConfigKind): boolean {
  switch (kind) {
    case 'string[]':
      return Array.isArray(value) && value.every(item => typeof item === 'string')
    case 'array':
      return Array.isArray(value)
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value)
    case 'string':
      return typeof value === 'string'
    case 'boolean':
      return typeof value === 'boolean'
    case 'number':
      return typeof value === 'number'
    case 'function':
      return typeof value === 'function'
    default:
      return false
  }
}

function read(config: any, path: string): { present: boolean, value: unknown } {
  let current = config
  for (const key of path.split('.')) {
    if (current == null || typeof current !== 'object' || !(key in current)) {
      return { present: false, value: undefined }
    }
    current = current[key]
  }
  return { present: true, value: current }
}

/**
 * The value echoed back, short enough to be worth reading.
 *
 * JSON rather than `String(value)`: an object stringifies to `[object Object]`,
 * which tells the reader nothing about what they wrote.
 */
function preview(value: unknown): string {
  let text: string
  try {
    text = JSON.stringify(value) ?? String(value)
  }
  catch {
    text = String(value)
  }
  return text.length > 40 ? `${text.slice(0, 40)}…` : text
}

export function configProblems(config: unknown, configFile: string): string[] {
  const problems: string[] = []

  for (const { path, kind } of RULES) {
    const { present, value } = read(config, path)
    // An absent or explicitly-undefined option falls back to the default.
    if (!present || value === undefined) {
      continue
    }

    const kinds = Array.isArray(kind) ? kind : [kind]
    if (kinds.some(one => matches(value, one))) {
      continue
    }

    problems.push(`${configFile}: \`${path}\` must be ${kinds.join(' or ')}, received ${describeKind(value)} (${preview(value)})`)
  }

  return problems
}
