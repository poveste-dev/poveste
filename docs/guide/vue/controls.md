# State & Controls

Controls give you the ability to interact with your components arguments.

## Defining a state

The first step is to define the state that will be shared to your story. Poveste will automatically synchronize the `data` or reactive data returned in your `setup`. Then you can proceed using your state as usual.

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

Poveste reads the props a component declares and builds a control for each one,
so a variant that renders a component needs nothing written for it to be
adjustable:

```vue
<Variant title="Naked">
  <MyButton />
</Variant>
```

The panel lists `MyButton`'s props, and editing one re-renders it. A prop the
story binds itself keeps its own value until you touch that control.

Set [`autoPropsDisabled`](../../reference/vue/story.md#autopropsdisabled) to turn
this off for a story or a variant.

### What it can read

Every way Vue lets you declare a prop, and what each produces in a **built**
book:

| declaration | control |
| --- | --- |
| `props: { label: { type: String } }` (Options API) | from the type |
| `defineProps({ label: { type: String } })` | from the type |
| `defineProps({ label: String })` | from the type |
| `defineProps(['label'])` | from the value the story passes |
| `defineProps<{ label?: string }>()` | from the default or the passed value |
| `defineProps<Props>()`, interface local or imported | from the default or the passed value |

The type-only rows are worth understanding, because they are the idiom the Vue
docs lead with. A production build **erases** the runtime types Vue infers from
`defineProps<T>()` — they exist for development-time validation — so in a built
book there is no declared type left to read. Poveste falls back on the default,
or on the value the story passes, which covers the ordinary case. It is only when
there is neither that you see the JSON editor.

### When you get a JSON editor instead

A prop with **no type, no default and nothing passed by the story** gets the JSON
editor. That is deliberate rather than a gap: with nothing to go on, guessing
would pick a control the prop cannot hold, and a text field on a prop that wants
an object invites you to type something the component will reject.

The fix is to give it something to read — a default on the prop, or a value in
the story:

A default the reader can see:

```
defineProps<{ label?: string }>()                                       // no control
withDefaults(defineProps<{ label?: string }>(), { label: 'Click me' })  // text field
```

Or a value in the story:

```vue
<MyButton label="Click me" />
```

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

Check out all the available controls in the [`@poveste/controls` package](https://github.com/poveste-dev/poveste/tree/main/packages/poveste-controls).

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
