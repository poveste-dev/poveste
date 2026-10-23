import type { ComponentDoc, DocEvent, DocProp, DocSlot, DocTag } from '@poveste/shared'
import type { DocgenOptions } from 'poveste/docgen'
import type { ComponentMeta, EventMeta, PropertyMeta, SlotMeta } from 'vue-component-meta'
import type { EventDoc } from './events.js'
import { declaredOnlyInPackages, DEFAULT_TAGS, HIDDEN_TAGS, normalizeDefault } from 'poveste/docgen'

export type VueDocgenOptions = DocgenOptions

type Tags = { name: string, text?: string }[]

function tagsOf(tags: Tags): DocTag[] {
  return tags.map(({ name, text }) => text === undefined ? { name } : { name, text })
}

function isHidden(tags: Tags) {
  return tags.some(tag => HIDDEN_TAGS.includes(tag.name))
}

function isInherited(prop: PropertyMeta, allow: string[]) {
  return declaredOnlyInPackages(prop.getDeclarations().map(declaration => declaration.file), allow)
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

function toMember(member: Pick<SlotMeta | EventMeta, 'name' | 'description' | 'type' | 'tags'>): DocSlot & DocEvent {
  return {
    name: member.name,
    ...member.description ? { description: member.description } : {},
    ...member.type ? { type: member.type } : {},
    tags: tagsOf(member.tags),
  }
}

/**
 * An event's payload, which vue-component-meta prints as the tuple it is declared as,
 * `[event: KeyboardEvent]`, written as the parameter list a handler takes (#1436). Only
 * when the outer brackets enclose the whole of it: `[a: A] | [b: B]` is left as it is.
 */
export function asParameters(type: string): string {
  if (!type.startsWith('[')) {
    return type
  }
  let depth = 0
  for (let i = 0; i < type.length; i++) {
    if ('[(<{'.includes(type[i]!)) {
      depth++
    }
    // The `>` of an arrow, `() => void`, closes nothing.
    else if (']>)}'.includes(type[i]!) && !(type[i] === '>' && type[i - 1] === '=') && --depth === 0) {
      return i === type.length - 1 ? `(${type.slice(1, -1)})` : type
    }
  }
  return type
}

// What vue-component-meta returns for an event is empty wherever its own reading is (#1462).
function withDocs(event: EventMeta, doc: EventDoc | undefined): Pick<EventMeta, 'name' | 'description' | 'type' | 'tags'> {
  return {
    name: event.name,
    description: event.description || doc?.description || '',
    type: asParameters(event.type),
    tags: event.tags.length ? event.tags : doc?.tags ?? [],
  }
}

function toSlot(slot: SlotMeta, slotProps: (slot: SlotMeta) => DocSlot['props'] & {}): DocSlot {
  const props = slotProps(slot)
  return { ...toMember(slot), ...props.length ? { props } : {} }
}

export function toComponentDoc(meta: ComponentMeta, options: VueDocgenOptions = {}, eventDocs = new Map<string, EventDoc>(), slotProps: (slot: SlotMeta) => DocSlot['props'] & {} = () => []): ComponentDoc {
  const allow = options.allow ?? []
  return {
    props: meta.props.filter(prop => !prop.global && !isHidden(prop.tags) && !isInherited(prop, allow)).map(toProp),
    slots: meta.slots.filter(slot => !isHidden(slot.tags)).map(slot => toSlot(slot, slotProps)),
    events: meta.events.map(event => withDocs(event, eventDocs.get(event.name))).filter(event => !isHidden(event.tags)).map(toMember),
  }
}
