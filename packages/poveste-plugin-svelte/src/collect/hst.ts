import Stub from '../client/Stub.svelte'
import Story from './Story.svelte'
import Variant from './Variant.svelte'

/**
 * The `Hst` a story is collected with.
 *
 * Collection reads a story's structure, so `Story` and `Variant` are the two
 * members that do anything. A story can still hold a builtin control in its
 * default slot, which collection renders to find the variants: every other
 * capitalised member is a component that renders nothing. With two members and
 * no more, `<Hst.Select>` there was `undefined(...)`, and one story stopped the
 * book's build (#925).
 *
 * Any name, not the list of controls: importing `@poveste/controls` here would
 * load every control into the collection worker to learn their names. A name
 * that is no control is caught where the story renders, in that story alone.
 */
export function collectHst(): Record<string, unknown> {
  return new Proxy<Record<string, unknown>>({ Story, Variant }, {
    get: (known, name) => known[name as string] ?? (typeof name === 'string' && /^[A-Z]/.test(name) ? Stub : undefined),
  })
}
