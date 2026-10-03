import type { ComponentDoc, DocEvent, DocProp, DocSlot, DocTag } from '@poveste/shared'
import type { ComponentMeta, EventMeta, PropertyMeta, SlotMeta } from 'vue-component-meta'

export interface VueDocgenOptions {
  /** Packages whose props count although they are declared under `node_modules`. */
  allow?: string[]
}

type Tags = { name: string, text?: string }[]

const HIDDEN_TAGS = ['internal', 'private']
// Aliases: bits-ui mixes them about 50/50, reka-ui and nuxt/ui write `@defaultValue`.
const DEFAULT_TAGS = ['default', 'defaultValue']

function tagsOf(tags: Tags): DocTag[] {
  return tags.map(({ name, text }) => text === undefined ? { name } : { name, text })
}

function isHidden(tags: Tags) {
  return tags.some(tag => HIDDEN_TAGS.includes(tag.name))
}

/** Declared only in installed packages none of which is allowed: an inherited attribute. */
function isInherited(prop: PropertyMeta, allow: string[]) {
  const files = prop.getDeclarations().map(declaration => declaration.file.replaceAll('\\', '/'))
  return files.length > 0 && files.every(file =>
    file.includes('/node_modules/') && !allow.some(pkg => file.includes(`/node_modules/${pkg}/`)))
}

/** A default as written, without the quoting a tag or the printer added. */
export function normalizeDefault(value: string) {
  return value.trim().replace(/^`(.*)`$/s, '$1').replace(/^'(.*)'$/s, '"$1"')
}

function toProp(prop: PropertyMeta): DocProp {
  const defaultTag = prop.tags.find(tag => DEFAULT_TAGS.includes(tag.name))?.text
  return {
    name: prop.name,
    ...prop.description ? { description: prop.description } : {},
    type: prop.type,
    required: prop.required,
    ...prop.default !== undefined ? { default: prop.default } : {},
    ...defaultTag !== undefined ? { defaultTag } : {},
    // The code's default is what runs, so it is the one shown; the flag is for the reader.
    ...prop.default !== undefined && defaultTag !== undefined && normalizeDefault(prop.default) !== normalizeDefault(defaultTag)
      ? { defaultConflict: true }
      : {},
    tags: tagsOf(prop.tags),
  }
}

function toMember(member: SlotMeta | EventMeta): DocSlot & DocEvent {
  return {
    name: member.name,
    ...member.description ? { description: member.description } : {},
    ...member.type ? { type: member.type } : {},
    tags: tagsOf(member.tags),
  }
}

export function toComponentDoc(meta: ComponentMeta, options: VueDocgenOptions = {}): ComponentDoc {
  const allow = options.allow ?? []
  return {
    props: meta.props.filter(prop => !prop.global && !isHidden(prop.tags) && !isInherited(prop, allow)).map(toProp),
    slots: meta.slots.filter(slot => !isHidden(slot.tags)).map(toMember),
    events: meta.events.filter(event => !isHidden(event.tags)).map(toMember),
  }
}
