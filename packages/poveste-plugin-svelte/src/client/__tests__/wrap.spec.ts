// @vitest-environment jsdom
import { components, defineControlElements } from '@poveste/controls'
import { flushSync, mount, tick, unmount } from 'svelte'
import { beforeAll, describe, expect, it } from 'vitest'
import LegacyControls from '../../../fixtures/controls/LegacyControls.svelte'
import RunesControls from '../../../fixtures/controls/RunesControls.svelte'
import { createWrappedComponent } from '../../util/svelte.js'
import Wrap from '../Wrap.svelte'

// What `render.ts` hands a story as `Hst`.
const Hst = Object.fromEntries(Object.entries(components).map(([key, component]) => [
  key.substring(3),
  createWrappedComponent(Wrap, component),
]))

async function settle() {
  for (let i = 0; i < 4; i++) {
    flushSync()
    await tick()
    await new Promise(resolve => setTimeout(resolve))
  }
}

function type(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('input'))
}

beforeAll(() => {
  defineControlElements()
})

describe.each([
  ['runes', RunesControls],
  ['legacy', LegacyControls],
])('a builtin control in a %s-mode story', (_mode, Story) => {
  function open() {
    const target = document.createElement('div')
    document.body.append(target)
    const story = mount(Story as any, { target, props: { Hst } })
    return { target, story }
  }

  it('renders as the control\'s element, with no Vue app of its own around it', async () => {
    const { target, story } = open()
    await settle()

    const element = target.querySelector('poveste-hst-text')!
    expect(element).not.toBeNull()
    expect(element.querySelector('input')!.value).toBe('start')
    // The element is the only Vue app a control boots; the bridge booted one inside a div.
    const appRoots = [...target.querySelectorAll('[data-v-app]')].map(node => node.localName)
    expect(appRoots.every(name => name.startsWith('poveste-hst-'))).toBe(true)
    unmount(story)
  })

  it('writes back through bind:value', async () => {
    const { target, story } = open()
    await settle()

    type(target.querySelector('input.poveste-text-input')!, 'typed')
    await settle()

    expect(target.querySelector('output')!.textContent).toBe('typed')
    unmount(story)
  })

  it('puts the content of its default slot in the button', async () => {
    const { target, story } = open()
    await settle()

    expect(target.querySelector('button.poveste-button')!.textContent).toMatch(/label/i)
    unmount(story)
  })

  it('renders scoped slot content once per call, with that call\'s props', async () => {
    const { target, story } = open()
    await settle()

    const tokens = [...target.querySelectorAll('[data-slot="token"] .token')].map(node => node.textContent)
    expect(tokens[0]).toBe('a')
    unmount(story)
  })

  it('tears the element\'s app down when the story is destroyed', async () => {
    const { target, story } = open()
    await settle()
    const element = target.querySelector('poveste-hst-text')!

    unmount(story)
    await settle()

    expect(element.isConnected).toBe(false)
    expect(element.querySelector('input')).toBeNull()
  })
})

describe('a builtin control in a runes-mode story', () => {
  it('hands on what is not a prop, and its listeners, to the control', async () => {
    const target = document.createElement('div')
    document.body.append(target)
    const story = mount(RunesControls as any, { target, props: { Hst } })
    await settle()

    expect(target.querySelector<HTMLInputElement>('input.poveste-text-input')!.placeholder).toBe('Type here')
    target.querySelector<HTMLButtonElement>('button.poveste-button')!.click()
    await settle()
    expect(target.querySelector('output')!.textContent).toBe('reset')
    unmount(story)
  })

  it('renders a select with its options, without a throw on the way', async () => {
    const errors: unknown[] = []
    const onError = (event: ErrorEvent) => errors.push(event.error)
    window.addEventListener('error', onError)
    const target = document.createElement('div')
    document.body.append(target)
    const story = mount(RunesControls as any, { target, props: { Hst } })
    await settle()

    expect(target.querySelector('.poveste-select [data-slot="value"]')!.textContent).toContain('a')
    expect(errors).toEqual([])
    window.removeEventListener('error', onError)
    unmount(story)
  })
})
