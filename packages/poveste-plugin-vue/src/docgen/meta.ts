import type { ComponentDoc, DocEvent, DocProp, DocSlot, DocTag } from '@poveste/shared'
import type { DocgenOptions } from 'poveste/docgen'
import type { ComponentMeta, EventMeta, PropertyMeta, SlotMeta } from 'vue-component-meta'
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
