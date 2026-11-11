// @vitest-environment jsdom
import type { App, Component } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, reactive } from 'vue'
import { generateSourceCode } from '../../codegen.js'
import { syncVariantAutoProps } from '../auto-props.js'
import { registerControlComponents } from '../global-components.js'

function controls(): Record<string, Component> {
  const registry: Record<string, Component> = {}
  registerControlComponents({ component: (name: string, component: Component) => {
    registry[name] = component
  } } as unknown as App)
  return registry
}

const { HstButton, HstSelect, HstText, HstTokenList } = controls() as Record<string, Component>

async function settle() {
  for (let i = 0; i < 4; i++) {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve))
  }
}

let app: App | null = null
let root: HTMLElement

function open(render: () => unknown) {
  root = document.createElement('div')
  document.body.append(root)
  app = createApp({ render })
  app.mount(root)
}

afterEach(async () => {
  app?.unmount()
  app = null
  root.remove()
  await settle()
})

function type(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('input'))
}

describe('a builtin control in a Vue story', () => {
  it('renders as the control\'s element, with no Vue app of its own around it', async () => {
    open(() => h(HstText, { title: 'Label', modelValue: 'start' }))
    await settle()

    expect(root.querySelector('poveste-hst-text input.poveste-text-input')).not.toBeNull()
    const appRoots = [...root.querySelectorAll('[data-v-app]')].map(node => node.localName)
    expect(appRoots).toEqual(['poveste-hst-text'])
  })

  it('writes back through v-model', async () => {
    const state = reactive({ label: 'start' })
    open(() => h(HstText, {
      'title': 'Label',
      'modelValue': state.label,
      'onUpdate:modelValue': (value: string) => {
        state.label = value
      },
    }))
    await settle()

    type(root.querySelector('input.poveste-text-input')!, 'typed')
    await settle()

    expect(state.label).toBe('typed')
    expect(root.querySelector<HTMLInputElement>('input.poveste-text-input')!.value).toBe('typed')
  })

  it('hands what is not a prop on to the control', async () => {
    open(() => h(HstText, { title: 'Label', modelValue: '', placeholder: 'Type here' }))
    await settle()

    expect(root.querySelector<HTMLInputElement>('input.poveste-text-input')!.placeholder).toBe('Type here')
  })

  it('puts the content of its default slot in the button', async () => {
    open(() => h(HstButton, null, { default: () => 'Reset' }))
    await settle()

    expect(root.querySelector('button.poveste-button')!.textContent).toBe('Reset')
  })

  // The bridge relocated the default slot only, so this one never arrived.
  it('puts the content of a named slot where the control renders it', async () => {
    open(() => h(HstSelect, { title: 'Game', options: ['a', 'b'], modelValue: 'a' }, {
      actions: () => h('i', { class: 'action' }, 'act'),
    }))
    await settle()

    expect(root.querySelector('.poveste-select .action')!.textContent).toBe('act')
  })

  it('renders scoped slot content once per call, with that call\'s props', async () => {
    const tokens = reactive<Record<string, string>>({ a: '1px', b: '2px' })
    open(() => h(HstTokenList, { tokens }, {
      default: ({ token }: { token: { key: string } }) => h('i', { class: 'token' }, token.key),
    }))
    await settle()

    const read = () => [...root.querySelectorAll('[data-slot="token"]')].map(node => node.querySelector('.token')?.textContent)
    expect(read()).toEqual(['a', 'b'])

    tokens.c = '3px'
    await settle()

    expect(read()).toEqual(['a', 'b', 'c'])
  })
})

describe('the Source panel and auto-props, given a builtin control', () => {
  const variant = (render: () => unknown) => ({
    id: 'v',
    title: 'v',
    state: {},
    slots: () => ({ default: render }),
  }) as any

  it('prints the control under its own name', async () => {
    const source = await generateSourceCode(variant(() => h(HstText, { title: 'Label', placeholder: 'Type here' })))

    expect(source).toBe('<HstText\n  title="Label"\n  placeholder="Type here"\n/>')
  })

  it('offers no controls for the control itself, only for the component beside it', () => {
    const Button = defineComponent({ name: 'MyButton', props: { label: String }, setup: () => () => null })
    const scanned: any = { state: reactive({}) }

    syncVariantAutoProps(scanned, [h(Button, { label: 'x' }), h(HstText, { title: 'Label' })], {}, '')

    expect(scanned.state._hPropDefs.map((def: { name: string }) => def.name)).toEqual(['MyButton'])
  })
})
