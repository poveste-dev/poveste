import type { Context } from '../context.js'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'pathe'

/** The subset of an Iconify collection a book's stories name, in the shape `addCollection` takes. */
export interface IconCollection {
  prefix: string
  icons: Record<string, unknown>
  aliases?: Record<string, { parent: string }>
  width?: number
  height?: number
}

interface IconifyJSON extends IconCollection {
  aliases?: Record<string, { parent: string }>
}

// Parsed once per book and prefix: `@iconify-json/carbon` alone is megabytes.
const loaded = new Map<string, IconifyJSON | null>()

function loadCollection(root: string, prefix: string): IconifyJSON | null {
  const key = `${root}\0${prefix}`
  if (!loaded.has(key)) {
    let data: IconifyJSON | null = null
    try {
      const file = createRequire(join(root, 'package.json')).resolve(`@iconify-json/${prefix}/icons.json`)
      data = JSON.parse(readFileSync(file, 'utf8')) as IconifyJSON
    }
    catch {
      // Not installed: the icon stays on the runtime lookup.
    }
    loaded.set(key, data)
  }
  return loaded.get(key) ?? null
}

/** `prefix:name` from every story's and variant's `icon`. */
export function storyIconNames(ctx: Pick<Context, 'storyFiles'>): string[] {
  const names = new Set<string>()
  for (const file of ctx.storyFiles) {
    for (const icon of [file.story?.icon, ...(file.story?.variants ?? []).map(variant => variant.icon)]) {
      if (typeof icon === 'string' && /^[a-z0-9-]+:[a-z0-9-]+$/.test(icon)) {
        names.add(icon)
      }
    }
  }
  return [...names].sort()
}

/**
 * The icons a book's stories name, taken from the book's own installed
 * `@iconify-json/<prefix>` packages, so the interface renders them without asking
 * api.iconify.design. One whose collection is not installed is left out and
 * still loads at runtime (#255).
 */
export function storyIcons(ctx: Pick<Context, 'root' | 'storyFiles'>): IconCollection[] {
  const byPrefix = new Map<string, string[]>()
  for (const icon of storyIconNames(ctx)) {
    const [prefix, name] = icon.split(':') as [string, string]
    byPrefix.set(prefix, [...byPrefix.get(prefix) ?? [], name])
  }

  const collections: IconCollection[] = []
  for (const [prefix, names] of byPrefix) {
    const data = loadCollection(ctx.root, prefix)
    if (!data) {
      continue
    }
    const subset: IconCollection = { prefix, icons: {}, aliases: {} }
    if (data.width !== undefined) {
      subset.width = data.width
    }
    if (data.height !== undefined) {
      subset.height = data.height
    }
    // An alias points at its parent, which has to come along too.
    const add = (name: string, depth = 0): void => {
      if (depth > 8) {
        return
      }
      if (name in data.icons) {
        subset.icons[name] = data.icons[name]
      }
      else if (data.aliases?.[name]) {
        subset.aliases![name] = data.aliases[name]
        add(data.aliases[name].parent, depth + 1)
      }
    }
    names.forEach(name => add(name))
    if (Object.keys(subset.icons).length > 0) {
      collections.push(subset)
    }
  }
  return collections
}
