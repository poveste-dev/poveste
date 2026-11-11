import type { ControlElement, ControlSlotCall } from '@poveste/controls'
import type { JSX } from 'solid-js'
import { components, CONTROL_SLOTS_EVENT, controlElementTag, defineControlElements, SLOT_CONTENT_ATTR } from '@poveste/controls'
import { createComponent, createRenderEffect, createSignal, Index, onCleanup, splitProps } from 'solid-js'
import { insert } from 'solid-js/web'

export interface ControlProps {
  value?: unknown
  /** Called with the control's new value; Solid has no two-way binding to write it back through. */
  onChange?: (value: any) => void
  /** What the control renders in its default slot, or a function of that slot's props. */
  children?: JSX.Element | ((props: Record<string, any>) => JSX.Element)
  [prop: string]: unknown
}

type ControlName = keyof typeof components extends `Hst${infer Name}` ? Name : never

/**
 * A builtin control as a Solid component: its element, given everything but `value`,
 * `onChange` and `children` as props.
 *
 * Not wired to a story's controls yet. Solid stories have no controls slot, so this is
 * what one consumes once they do, rather than a third bridge booting Vue per control.
 */
export function controlComponent(name: keyof typeof components): (props: ControlProps) => JSX.Element {
  const tag = controlElementTag(name)

  return (props) => {
    defineControlElements()
    const [own, rest] = splitProps(props, ['value', 'onChange', 'children'])
    const el = document.createElement(tag) as ControlElement

    // A render effect runs now, so the element has its props before anything inserts it.
    createRenderEffect(() => {
      el.props = {
        ...rest,
        'modelValue': own.value,
        'onUpdate:modelValue': (value: unknown) => own.onChange?.(value),
      }
    })

    if (props.children === undefined) {
      return el
    }

    const [calls, setCalls] = createSignal<readonly ControlSlotCall[]>([])
    const read = () => setCalls(el.slotCalls)
    el.addEventListener(CONTROL_SLOTS_EVENT, read)
    onCleanup(() => el.removeEventListener(CONTROL_SLOTS_EVENT, read))
    el.slots = ['default']

    const source = document.createElement('span')
    source.hidden = true
    insert(source, () => createComponent(Index, {
      get each() {
        return calls()
      },
      children: (call: () => ControlSlotCall, index: number) => {
        const node = document.createElement('span')
        node.setAttribute(SLOT_CONTENT_ATTR, String(index))
        node.style.display = 'contents'
        insert(node, () => {
          const children = own.children
          return typeof children === 'function' ? children(call().props) : children
        })
        return node
      },
    }))
    el.slotSource = source

    return [el, source] as unknown as JSX.Element
  }
}

/** Every builtin control, named as Svelte's `Hst` names them: `Hst.Text`, `Hst.Select`. */
export const Hst = Object.fromEntries(
  Object.keys(components).map(key => [key.substring(3), controlComponent(key as keyof typeof components)]),
) as Record<ControlName, (props: ControlProps) => JSX.Element>
