import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { isComponentBinding } from '../util.js'

// What Nuxt's dev runtime config does with a key it does not carry (#1454).
function warningProxy(target: Record<string, unknown>) {
  const read: string[] = []
  const proxy = new Proxy(target, {
    get(object, key, receiver) {
      if (typeof key === 'string' && !(key in object)) {
        read.push(key)
      }
      return Reflect.get(object, key, receiver)
    },
  })
  return { proxy, read }
}

describe('isComponentBinding', () => {
  it('reads no key a proxied binding does not carry', () => {
    const { proxy, read } = warningProxy({ public: { configFromNuxt: 'value' }, app: {} })

    expect(isComponentBinding(proxy)).toBe(false)
    expect(read).toEqual([])
  })

  it('still skips a component, however it was defined', () => {
    expect(isComponentBinding(defineComponent({ setup: () => () => h('div') }))).toBe(true)
    expect(isComponentBinding({ render: () => h('div') })).toBe(true)
    expect(isComponentBinding({ __file: 'Button.vue' })).toBe(true)
    expect(isComponentBinding(() => h('div'))).toBe(true)
  })

  it('keeps ordinary state', () => {
    expect(isComponentBinding({ label: 'text', render: 'not a function' })).toBe(false)
    expect(isComponentBinding('text')).toBe(false)
    expect(isComponentBinding(null)).toBe(false)
    expect(isComponentBinding(undefined)).toBe(false)
  })
})
