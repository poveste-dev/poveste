---
title: 'State and controls in Vue — make story props editable'
description: 'Bind story state to the controls pane so a reader can change props and see the Vue component react.'
---

# State & Controls

Controls give you the ability to interact with your components arguments.

## Defining a state

The first step is to define the state that will be shared to your story. Poveste will automatically synchronize the `data` or reactive data returned in your `setup`. Then you can proceed using your state as usual.

### Keeping a binding out of the sync

Everything the story exposes is walked on every change, in both directions, so a binding that reaches a large object graph — a map, a chart, a template ref onto a component that holds one — makes every keystroke expensive.

Mark it raw, and Poveste leaves it alone:

```vue
<script lang="ts" setup>
import { markRaw, ref } from 'vue'

const map = ref(markRaw(createMap()))
</script>
```

[`markRaw`](https://vuejs.org/api/reactivity-advanced.html#markraw) is Vue's own way of saying "do not look inside this", and Poveste reads it the same way: the value is not walked, not copied, and not sent between your story and the panel. It still shows up in the controls panel, but editing it there will not reach your story, and changes you make inside it are not synchronized back. That is the same bargain Vue makes, and it is what makes the binding cheap.

A template ref onto a component you called `defineExpose` in is **already** marked, by Vue, so it costs nothing and needs nothing from you.

Example with Option API:

```vue{11-18}
<script lang="ts">
import { defineComponent } from 'vue'
import MyButton from './MyButton.vue'

export default defineComponent({
  components: {
    MyButton,
  },

  data () {
    // Poveste will inspect and synchronize this
    return {
      state: {
        disabled: false,
        content: 'Hello world',
      },
      message: 'Meow!',
    }
  },
})
</script>

<template>
  <Story>
    <Variant>
      <MyButton :disabled="state.disabled">
        {{ state.content }}
      </MyButton>

      <input v-model.number="message">
    </Variant>
  </Story>
</template>
```

Example with Composition API:

```vue{18-22}
<script lang="ts">
import { reactive, ref, defineComponent } from 'vue'
import MyButton from './MyButton.vue'

export default defineComponent({
  components: {
    MyButton,
  },

  setup () {
    const state = reactive({
      disabled: false,
      content: 'Hello world',
    })

    const message = ref('Meow!')

    // Poveste will inspect and synchronize this
    return {
      state,
      message,
    }
  }
})
</script>

<template>
  <Story>
    <Variant>
      <MyButton :disabled="state.disabled">
        {{ state.content }}
      </MyButton>

      <input v-model.number="message">
    </Variant>
  </Story>
</template>
```

Example with Composition API (Script Setup):

```vue
<script lang="ts" setup>
import { reactive, ref } from 'vue'
import MyButton from './MyButton.vue'

const state = reactive({
  disabled: false,
  content: 'Hello world',
})

const message = ref('Meow!')
</script>

<template>
  <Story>
    <Variant>
      <MyButton :disabled="state.disabled">
        {{ state.content }}
      </MyButton>

      <input v-model.number="message">
    </Variant>
  </Story>
</template>
```

It can also be useful to declare some data that isn't going to be reactive, for example some fixture data or configuration:

```vue{10-15}
<script lang="ts" setup>
import { reactive } from 'vue'
import MyButton from './MyButton.vue'

// Main reactive state of the stories
const state = reactive({
  colorId: 'primary',
})

// Some fixture/configuration data
const colors = {
  primary: '#f00',
  secondary: '#0f0',
  // ...
}
</script>

<template>
  <Story>
    <Variant>
      <MyButton :color="colors[state.colorId]">
        {{ state.colorId }}
      </MyButton>
    </Variant>
  </Story>
</template>
```

### What state may hold

State reaches the preview through `postMessage`, which is [structured clone](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm), and that is the contract: a `Date`, a `Map`, a `Set`, a `RegExp`, an `Error`, a typed array and a `BigInt` arrive on the other side as themselves.

A class instance crosses as a plain object — structured clone carries the data and drops the prototype, so its methods and accessors do not come with it. A `URL`, a DOM node, a `Promise` and a function do not cross at all, and the key simply does not arrive.

The controls panel drives what it can write back faithfully: strings, numbers, booleans, plain objects and arrays. Everything else is named in the JSON editor and left read-only — `[Date 2026-09-20T14:30:00.000Z]`, `[Map(2)]`, `[RegExp /ab+c/gi]` — because that editor writes back whatever it parses, and parsing `"2026-09-20T14:30:00.000Z"` would put a string where your `Date` was ([#977](https://github.com/poveste-dev/poveste/issues/977)).

## Controls panel

To create the control panel, Poveste provides a `controls` slot. You are free to render any element or components inside the slot.

```vue{18-21}
<script lang="ts" setup>
import { reactive } from 'vue'
import MyButton from './MyButton.vue'

const state = reactive({
  disabled: false,
  content: 'Hello world',
})
</script>

<template>
  <Story>
    <Variant>
      <MyButton :disabled="state.disabled">
        {{ state.content }}
      </MyButton>

      <template #controls>
        Content: <input type="text" v-model="state.content" />
        Disabled: <input type="checkbox" v-model="state.disabled" />
      </template>
    </Variant>
  </Story>
</template>
```

You can also share the same default controls for all variants by putting the slot directly under the `<Story>` component:

```vue{3-6}
<template>
  <Story>
    <template #controls>
      Content: <input type="text" v-model="state.content" />
      Disabled: <input type="checkbox" v-model="state.disabled" />
    </template>

    <Variant>
      <MyButton :disabled="state.disabled">
        {{ state.content }}
      </MyButton>
      <!-- Reusing controls -->
    </Variant>

    <Variant>
      <MyButton :disabled="state.disabled">
        {{ state.content }}
      </MyButton>
      <!-- Reusing controls -->
    </Variant>
  </Story>
</template>
```

A variant can then override the slot if needed.

## Automatic controls

Poveste builds a control for each prop a component declares, so a variant that renders a component needs nothing written for it to be adjustable:

```vue-html
<Variant title="Naked">
  <MyButton />
</Variant>
```

The panel lists `MyButton`'s props, and editing one re-renders it. A prop the story binds itself keeps its own value until you touch that control.

Set [`autoPropsDisabled`](../../reference/vue/story.md#autopropsdisabled) to turn this off for a story or a variant, or [`autoProps`](#override-or-hide-a-control) to change or hide one control.

### Controls from types

When a component is documented, which is what fills the [Docs tab](./docs.md#props-slots-and-events), each prop's control comes from its TypeScript type:

| type | control |
| --- | --- |
| `string`, or a template literal such as `` `${number}px` `` | text field |
| `number` | number field |
| `boolean` | checkbox |
| a union of string or number literals, `'sm' \| 'md' \| 'lg'`, written out, behind an alias, an enum, or `(typeof sizes)[number]` | a select of its values |
| an array, a tuple, or an object type your code declares | JSON editor |
| anything else: a function, a `Date`, an element, a mix such as `string \| HTMLElement` | what the component carries at runtime, below |

`defineProps<Props>()` with `Props` imported from another file reads the same as one written inline, and so does an interface that `extends` another.

Types come from the same place as the Docs tab. A component imported from an installed package gets no table in a Vue or Svelte book, so it gets no types either, and a prop the Docs tab doesn't show keeps its runtime control: one declared in a package under `node_modules` that [`autoDocs.allow`](../../reference/config.md#autodocs) doesn't name, or one tagged `@internal`. With `autoDocs: false`, no types are read and every control comes from runtime.

The panel doesn't wait for types. It shows the runtime controls at once and changes a control to the one its type picks when the types arrive:

- In `poveste dev`, they arrive when the docs worker has read them. On a story's first open that is the cost of opening the Docs tab: measured on `examples/vue`, about 1.4 s and 370 MB more for the dev server.
- In a built book the build read them, and they arrive as a small file per component.

A control you are typing in, or that holds a value you set, keeps its kind until you leave it and remove the value with the button beside it.

Two components of the same name, imported by one story from different folders, get no types in a built book: a build names a component only by its file name, so Poveste can't tell which types are which, and both keep their runtime controls. `poveste dev` knows the full path, and gives each its own.

### From runtime

Without types, what a component carries at runtime picks the control. In a **built** book, every way Vue lets you declare a prop produces:

| declaration | control |
| --- | --- |
| `props: { label: { type: String } }` (Options API) | from the type |
| `defineProps({ label: { type: String } })` | from the type |
| `defineProps({ label: String })` | from the type |
| `defineProps(['label'])` | from the value the story passes |
| `defineProps<{ label?: string }>()` | from the default or the passed value |
| `defineProps<Props>()`, interface local or imported | from the default or the passed value |

A production build **erases** the runtime types Vue infers from `defineProps<T>()`, so the type-only rows fall back on the default, or on the value the story passes. That's only what shows before types arrive, or what stays when the component isn't documented.

### When you get a JSON editor instead

A prop gets the JSON editor when nothing picks another control: its type is an array or an object, or the component isn't documented and the prop has no runtime type, no default, and no value from the story. With nothing to go on, guessing would pick a control the prop can't hold.

The fix is something to read: the component documented, a default on the prop, a value in the story, or an [`autoProps`](#override-or-hide-a-control) override.

### Override or hide a control

`autoProps` on a variant, or on the story for every variant, changes a prop's control by the prop's name:

```vue-html
<Variant
  title="Sizes"
  :auto-props="{
    size: { control: 'select', options: ['sm', 'md', { label: 'Large', value: 'lg' }] },
    level: { control: 'slider', min: 1, max: 6 },
    tone: 'text',
    onClick: false,
  }"
>
  <MyButton />
</Variant>
```

- `false` hides the prop's control.
- A control's name picks it: `'text'`, `'textarea'`, `'number'`, `'checkbox'`, `'json'`, `'color'` or `'date'`.
- A select needs its options, as values or `{ label, value }` pairs: `{ control: 'select', options: [...] }`.
- A slider needs its range: `{ control: 'slider', min, max, step }`, with `step` optional.

An override wins over the prop's type. A variant's `autoProps` replaces the story's whole, as its other options do.

## Builtin controls

To build a control panel a bit more easily, Poveste provides builtin controls with design that fits the rest of the UI.

```vue{19-20}
<script lang="ts" setup>
import { reactive } from 'vue'
import MyButton from './MyButton.vue'

const state = reactive({
  disabled: false,
  content: 'Hello world',
})
</script>

<template>
  <Story>
    <Variant>
      <MyButton :disabled="state.disabled">
        {{ state.content }}
      </MyButton>

      <template #controls>
        <HstText v-model="state.content" title="Content" />
        <HstCheckbox v-model="state.disabled" title="Disabled" />
      </template>
    </Variant>
  </Story>
</template>
```

### Colour and date

Two of the builtin controls take a string where you might expect an object.

`HstColor` is a colour picker — a saturation area, a hue slider and a hex field, in a popover. Its model is a hex string, `#3366ff`.

`HstDate` is a date field with a calendar. Its model is an ISO string — `2026-09-20`, or `2026-09-20T14:30` when `time` is set, which adds the hour and minute segments and puts them in the value.

Both take an optional `title`, and both emit a string.

```vue
<script lang="ts" setup>
import { reactive } from 'vue'

const state = reactive({
  tint: '#3366ff',
  when: '2026-09-20T14:30',
})
</script>

<template>
  <Story>
    <Variant>
      <p :style="{ color: state.tint }">
        {{ state.when }}
      </p>

      <template #controls>
        <HstColor v-model="state.tint" title="Tint" />
        <HstDate v-model="state.when" title="When" time />
      </template>
    </Variant>
  </Story>
</template>
```

The model is a string because a story keeps its state as JSON, and the `DateValue` objects Reka works in do not survive the trip into the sandbox a story renders in.

Both load only when a book uses one — they are about 120 KB and 60 KB of a built book, and nothing renders until the chunk arrives, so the row appears a moment after the rest of the panel rather than with it.

`HstColorSelect` is a different and older control that is still exported: a text field beside the browser's own `<input type="color">`, which opens the operating system's picker. It takes a hex string too, so the signature will not tell you which one you have.

### Every builtin control

Every control but the button takes a `title`, its label in the panel, and binds its value with `v-model`.

| Control | Value | Props besides `title` |
| --- | --- | --- |
| `HstText` | a string | — |
| `HstTextarea` | a string | — |
| `HstNumber` | a number | — |
| `HstSlider` | a number | `min` and `max`, both required |
| `HstCheckbox` | a boolean | — |
| `HstCheckboxList` | an array of strings | `options`, required: strings, or `{ label, value }` objects |
| `HstSelect` | any value | `options`, required: an object of value to label, strings, or `{ label, value }` objects |
| `HstRadio` | a string | `options`, required: an object of value to label, or an array of strings or `{ label, value }` objects |
| `HstButtonGroup` | a string | `options`, required, in any of `Select`'s forms |
| `HstColor` | a hex string | — (the picker; see [Colour and date](#colour-and-date)) |
| `HstColorSelect` | a hex string | — (the older text field and native colour input) |
| `HstDate` | an ISO date string | `time`, to pick a time as well |
| `HstJson` | any value that survives JSON | — |
| `HstButton` | none: a button, whose click your listener handles | `color`: `'default'`, `'primary'` or `'flat'` |

These are registered alongside the controls and are not controls: they take no value and no `title`.

| Component | Props | What it is |
| --- | --- | --- |
| `HstColorShades` | `shades`, an object of shade to colour; `getName(key, color)`, which renames a shade; `search`, a case-insensitive pattern that keeps only the shades whose name matches | draws a palette; `@poveste/plugin-tailwind` uses it for its colour pages |
| `HstTokenList` | `tokens`, an object of name to value; `getName(key, value)`, which renames a token | lists design tokens; used for Tailwind's pages |
| `HstTokenGrid` | `tokens` and `getName`, as above, and `colSize` | the same tokens as a grid |
| `HstCopyIcon` | `content`, the text to copy, or a function that returns it, at once or as a promise; `loading`, which makes a click say "Still loading" instead of copying | a copy-to-clipboard button; the chrome uses it |

`HstTooltip` is exported too, for Poveste's own interface, and is not registered for stories.

## Init state

As an alternative to the above, you can pass an `initState` prop to the Story or Variant, which should be a function returning a state object. It's useful to have different states for variants in the same story and to be a bit more explicit at the expense of being more verbose.

You can then use the `state` slot props on the `<Variant>` slots to access the state.

Example:

```vue{24,26,40,60,62,66}
<script lang="ts" setup>
function initState () {
  return {
    count: 0,
    text: '',
  }
}

function initState2 () {
  return {
    meow: {
      foo: 'bar',
    },
  }
}
</script>

<template>
  <Story
    title="State"
  >
    <Variant
      title="default"
      :init-state="initState"
    >
      <template #default="{ state }">
        <h1>State</h1>
        <div>
          <pre>{{ state }}</pre>
          <input
            v-model.number="state.count"
            type="number"
          >
          <input
            v-model="state.text"
          >
        </div>
      </template>

      <template #controls="{ state }">
        <div class="controls">
          <button @click="state.count--">
            -1
          </button>
          <button @click="state.count++">
            +1
          </button>
          <span>{{ state.count }}</span>
        </div>

        <HstText
          v-model="state.text"
          title="Text"
        />
      </template>
    </Variant>

    <Variant
      title="Nested state object"
      :init-state="initState2"
    >
      <template #default="{ state }">
        <input v-model="state.meow.foo">
      </template>

      <template #controls="{ state }">
        <HstText
          v-model="state.meow.foo"
          title="meow.foo"
        />
      </template>
    </Variant>
  </Story>
</template>
```
