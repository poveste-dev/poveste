// @vitest-environment jsdom
import { createComponent, createRoot, createSignal } from 'solid-js'
import { insert } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'
import { Hst } from '../client/controls'

let dispose: (() => void) | undefined
let root: HTMLElement

function open(render: () => unknown) {
  root = document.createElement('div')
  document.body.append(root)
  createRoot((done) => {
    dispose = done
    insert(root, render as () => any)
  })
}

async function settle() {
  for (let i = 0; i < 4; i++) {
    await new Promise(resolve => setTimeout(resolve))
  }
}

afterEach(async () => {
  dispose?.()
  root.remove()
  await settle()
})

function type(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('input'))
}

describe('a builtin control in Solid', () => {
  it('renders the control\'s element with the value it is given, and reports a change', async () => {
    const [label, setLabel] = createSignal('start')
    open(() => createComponent(Hst.Text, {
      title: 'Label',
      get value() {
        return label()
      },
      onChange: setLabel,
    }))
    await settle()

    const input = root.querySelector<HTMLInputElement>('poveste-hst-text input.poveste-text-input')!
    expect(input.value).toBe('start')

    type(input, 'typed')
    await settle()

    expect(label()).toBe('typed')
    expect(input.value).toBe('typed')
  })

  it('renders a select with its options from the first render', async () => {
    open(() => createComponent(Hst.Select, { title: 'Game', options: { a: 'Alpha', b: 'Beta' }, value: 'b' }))
    await settle()

    expect(root.querySelector('.poveste-select [data-slot="value"]')!.textContent).toContain('Beta')
  })

  it('puts its children in the control\'s default slot', async () => {
    open(() => createComponent(Hst.Button, { children: 'Reset' }))
    await settle()

    expect(root.querySelector('button.poveste-button')!.textContent).toBe('Reset')
  })

  it('renders a function child once per slot call, with that call\'s props', async () => {
    open(() => createComponent(Hst.TokenList, {
      tokens: { a: '1px', b: '2px' },
      children: ({ token }: { token: { key: string } }) => {
        const node = document.createElement('i')
        node.className = 'token'
        node.textContent = token.key
        return node
      },
    }))
    await settle()

    const tokens = [...root.querySelectorAll('[data-slot="token"] .token')].map(node => node.textContent)
    expect(tokens).toEqual(['a', 'b'])
  })
})
