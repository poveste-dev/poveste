import type { ControlElement } from '../index'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { components, CONTROL_SLOTS_EVENT, controlElementTag, defineControlElements, SLOT_CONTENT_ATTR } from '../index'

function create(name: keyof typeof components) {
  return document.createElement(controlElementTag(name)) as ControlElement
}

async function settle() {
  await nextTick()
  await new Promise(resolve => setTimeout(resolve))
}

beforeAll(() => {
  defineControlElements()
})

// Not the body itself: a control's tooltip teleports its anchors there, and
// clearing it out from under them fails the unmount a tick later.
let root: HTMLElement

beforeEach(() => {
  root = document.createElement('div')
  document.body.append(root)
})

afterEach(async () => {
  root.remove()
  await settle()
})

describe('defineControlElements', () => {
  it('registers every control under its tag', () => {
    for (const name of Object.keys(components)) {
      expect(customElements.get(controlElementTag(name)), name).toBeDefined()
    }
  })

  it('keeps the first definition when called again, as every realm and app will', () => {
    const first = customElements.get('poveste-hst-text')
    expect(() => defineControlElements()).not.toThrow()
    expect(customElements.get('poveste-hst-text')).toBe(first)
  })

  it('names a tag from the control', () => {
    expect(controlElementTag('HstColorSelect')).toBe('poveste-hst-color-select')
  })

  it('makes every element layout-transparent, by a rule that names each tag', () => {
    const source = readFileSync(join(import.meta.dirname, 'ControlHost.vue'), 'utf8')
    const style = /<style>([\s\S]*)<\/style>/.exec(source)![1]!
    const listed = [...style.matchAll(/poveste-hst-[a-z-]+/g)].map(match => match[0]).sort()
    expect(listed).toEqual(Object.keys(components).map(controlElementTag).sort())
  })
})

describe('a control element', () => {
  // A Vue element mounts its app on connect. `HstSelect` reads `options` while it
  // sets up, so an element that rendered before a wrapper handed them over threw.
  it('renders nothing until it has its props, whichever side of connecting they land on', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const select = create('HstSelect')
    root.append(select)
    await settle()
    expect(select.childElementCount).toBe(0)

    select.props = { title: 'Game', options: ['a', 'b'], modelValue: 'a' }
    await settle()

    expect(select.querySelector('[data-slot="trigger"]')).not.toBeNull()
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })

  it('renders at once when its props were set before it connected', () => {
    const text = create('HstText')
    text.props = { title: 'Label', modelValue: 'hello' }
    root.append(text)

    expect(text.querySelector('input')!.value).toBe('hello')
  })

  it('keeps the parts a consumer styles by', () => {
    const text = create('HstText')
    text.props = { title: 'Label', modelValue: '' }
    root.append(text)

    const parts = [...text.querySelectorAll('[data-slot]')].map(node => node.getAttribute('data-slot'))
    expect(parts).toEqual(expect.arrayContaining(['wrapper', 'title', 'field', 'control']))
  })

  it('passes what is not a prop on to the control, as a Vue parent would', () => {
    const text = create('HstText')
    text.props = { title: 'Label', modelValue: '', placeholder: 'Type here', class: 'mine' }
    root.append(text)

    expect(text.querySelector('input')!.placeholder).toBe('Type here')
    expect(text.querySelector('.poveste-text')!.classList).toContain('mine')
    expect(text.hasAttribute('title')).toBe(false)
  })

  it('updates the control when a prop changes', async () => {
    const text = create('HstText')
    text.props = { title: 'Label', modelValue: 'one' }
    root.append(text)

    text.props = { title: 'Label', modelValue: 'two' }
    await nextTick()

    expect(text.querySelector('input')!.value).toBe('two')
  })

  it('writes back both to a listener in its props and as an event on itself', () => {
    const fromProps = vi.fn()
    const fromEvent = vi.fn()
    const text = create('HstText')
    text.props = { 'title': 'Label', 'modelValue': '', 'onUpdate:modelValue': fromProps }
    text.addEventListener('update:modelValue', event => fromEvent((event as CustomEvent).detail))
    root.append(text)

    const input = text.querySelector('input')!
    input.value = 'typed'
    input.dispatchEvent(new Event('input'))

    expect(fromProps).toHaveBeenCalledWith('typed')
    expect(fromEvent).toHaveBeenCalledWith(['typed'])
  })

  it('tears its app down when it leaves the document', async () => {
    const text = create('HstText')
    text.props = { title: 'Label', modelValue: '' }
    root.append(text)
    expect(text.querySelector('input')).not.toBeNull()

    text.remove()
    await nextTick()

    expect(text.querySelector('input')).toBeNull()
  })
})

describe('slot content', () => {
  function stage(element: ControlElement) {
    const source = document.createElement('div')
    source.hidden = true
    element.after(source)
    element.slotSource = source
    element.addEventListener(CONTROL_SLOTS_EVENT, () => {
      source.replaceChildren(...element.slotCalls.map((call, index) => {
        const node = document.createElement('span')
        node.setAttribute(SLOT_CONTENT_ATTR, String(index))
        node.textContent = call.name === 'default' && 'token' in call.props
          ? `swatch for ${(call.props.token as { key: string }).key}`
          : `content for ${call.name}`
        return node
      }))
    })
    return source
  }

  it('reaches the place the control renders its default slot', async () => {
    const button = create('HstButton')
    button.props = {}
    button.slots = ['default']
    root.append(button)
    stage(button)
    await settle()

    expect(button.querySelector('button')!.textContent).toBe('content for default')
  })

  it('reaches a named slot', async () => {
    const select = create('HstSelect')
    select.props = { title: 'Game', options: ['a'], modelValue: 'a' }
    select.slots = ['actions']
    root.append(select)
    stage(select)
    await settle()

    expect(select.querySelector('.poveste-wrapper')!.textContent).toContain('content for actions')
  })

  it('hands each call its slot props, so scoped content renders once per call', async () => {
    const list = create('HstTokenList')
    list.props = { tokens: { a: '1px', b: '2px' } }
    list.slots = ['default']
    root.append(list)
    stage(list)
    await settle()

    const tokens = [...list.querySelectorAll('[data-slot="token"]')].map(node => node.textContent)
    expect(tokens[0]).toContain('swatch for a')
    expect(tokens[1]).toContain('swatch for b')
  })

  it('leaves a slot with fallback content alone when the wrapper has none for it', () => {
    const shades = create('HstColorShades')
    shades.props = { shades: { 500: '#000' } }
    root.append(shades)

    expect(shades.querySelector('[data-slot="swatch"]')).not.toBeNull()
  })
})
