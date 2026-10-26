<script>
  import {
    createApp as _createApp,
    h as _h,
    reactive as _reactive,
  } from '@poveste/vendors/vue'
  import { createEventDispatcher, onMount } from 'svelte'

  export let controlComponent
  export let value

  const dispatch = createEventDispatcher()

  let el

  let app

  const state = _reactive({})

  function updateState(value, attrs) {
    Object.assign(state, {
      value,
      attrs,
    })
  }

  onMount(() => {
    updateState(value, $$restProps)

    // SPIKE #348 instrumentation — counts the Vue applications this bridge boots
    // and which document each one lands in. Not for merge.
    const _c = (globalThis.__pvt348 ??= { apps: 0, docs: [] })
    _c.apps++
    _c.docs.push(el.ownerDocument === globalThis.document ? 'host' : 'iframe')

    app = _createApp({
      render() {
        const finalListeners = {}
        if (controlComponent.emits) {
          for (const k in controlComponent.emits) {
            const key = Array.isArray(controlComponent.emits) ? controlComponent.emits[k] : k
            const finalKey = key === 'input' ? 'update:modelValue' : key
            finalListeners[`on${finalKey.charAt(0).toUpperCase()}${finalKey.substring(1)}`] = (...args) => {
              if (key === 'update:modelValue') {
                value = args[0]
              }
              else {
                dispatch(key, ...args)
              }
            }
          }
        }

        // `state` is the Vue-reactive mirror kept in sync by the `$:` below.
        // Reading the plain `value` here would make the render depend on a
        // variable Vue cannot track — it only saw fresh values because the
        // `state` mutation was what triggered the re-render in the first place.
        return _h(controlComponent, {
          modelValue: state.value,
          ...state.attrs,
          ...finalListeners,
          key: 'component',
        })
      },
    })
    app.mount(el)
  })

  $: updateState(value, $$restProps)
</script>

<div bind:this={el}>
  {controlComponent.name}
</div>
