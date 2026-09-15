import { expect, test } from '@playwright/test'

const cases: { variant: string, expected: string }[] = [
  {
    variant: 'html',
    expected: `<h1>Title</h1>
<hr>
<pre>{
  "object": {
    "foo": "bar"
  }
}</pre>
<div data-testid="object">
  {
    "object": {
      "foo": "bar"
    }
  }
</div>
<button>A button</button>
<button class="btn btn-primary">
   A button 
</button>
<button
  class="btn btn-primary"
  :style="{
    color: 'red',
  }"
>
   A button 
</button>
<input
  type="phone"
  placeholder="Enter your phone number"
>
<ul>
  <li>Single</li>
</ul>
<p>
  <span>Next to it:</span>**** 
</p>
<p>
  <span>Not next to it:</span>
  ****
</p>
<button> Spaces </button>`,
  },
  {
    variant: 'props',
    expected: `<input placeholder="Counter...">
<input :value="0">
<input
  :value="0"
  placeholder="Counter..."
>
<input
  :value="{
    foo: 'bar',
  }"
  :items="[1, 2, 3]"
>`,
  },
  {
    variant: 'boolean+props',
    expected: `<BaseButton disabled>
   Button 
</BaseButton>
<BaseButton :disabled="false">
   Button 
</BaseButton>`,
  },
  {
    variant: 'click-events',
    expected: `<button @click="onClick">
   Click me 
</button>
<button @click="onClick($event)">
   Click me 
</button>
<button @click="(event) => onClick(event)">
   Click me 
</button>`,
  },
  {
    variant: 'v-model',
    expected: `<input
  v-model.number="state.count"
  type="number"
>
<input v-model="state.text">
<HstText v-model="state.text" />
<HstText
  v-model.number="state.count"
  type="number"
/>
<HstText
  v-model:foo="state.count"
  v-model:my-prop.number="state.count"
/>
<HstText v-model="value" />`,
  },
  {
    variant: 'custom-directive',
    expected: `<button v-tooltip="'Info'">
  A button
</button>
<button v-tooltip.bottom="'Info'">
  A button
</button>
<button v-tooltip.bottom:foo="'Info'">
  A button
</button>
<button
  v-tooltip="{
    content: 'Info',
    html: true,
  }"
>
  A button
</button>
<div v-dashed-border="'#f00'">
  This is a test
</div>`,
  },
  {
    variant: 'slots',
    expected: `<ModalWithSlots>
  <template #title>
     Title 
  </template>
  <template #footer>
     Footer 
  </template>
   Content 
</ModalWithSlots>`,
  },
  {
    variant: 'slot-with-props',
    expected: `<SlotWithProps>
  <template #default="{ foo, object, fn }">
    <p :title="{{ foo.toString() }}">
       foo: {{ foo }}
    </p>
    <p :title="object.answer.toString()">
       object.answer: {{ object.answer }}
    </p>
    <p :title="fn(2)">
       fn: {{ fn(2) }}
    </p>
  </template>
</SlotWithProps>`,
  },
  {
    variant: 'slot-with-props-named',
    expected: `<SlotWithProps>
  <template #named="{ foo, object, fn }">
    <p :title="{{ foo.toString() }}">
       foo: {{ foo }}
    </p>
    <p :title="object.answer.toString()">
       object.answer: {{ object.answer }}
    </p>
    <p :title="fn(2)">
       fn: {{ fn(2) }}
    </p>
  </template>
</SlotWithProps>`,
  },
  {
    variant: 'list',
    expected: `<ul>
  <li>Foo</li>
  <li>Bar</li>
</ul>`,
  },
  {
    // Both handlers are written with `"` inside them, and this used to rewrite
    // every one into `'` and escape the author's own `'` for a JavaScript
    // string the value never becomes — so the pane showed code nobody wrote
    // (#602). Each attribute now takes the delimiter its contents leave free.
    //
    // `get-name` carries both quote characters, so whichever delimiter it takes
    // has to be escaped inside. The rarer one wins: one `&#39;` here rather
    // than two `&quot;`, and the `"` the author typed survive.
    variant: 'function',
    expected: `<div
  :hello='(arg1, arg2, arg3) => "meow".repeat(arg3)'
  :get-name='(shade) => \`\${"&#39;very-".repeat(5)}long-\${shade}\`'
/>`,
  },
]

test.describe('codegen (vue 3)', () => {
  for (const { variant, expected } of cases) {
    test(`renders source code for the ${variant} variant`, async ({ page }) => {
      await page.goto(`/story/src-components-codegen-story-vue?variantId=${variant}`)
      // textContent comparison preserves whitespace; toHaveText would normalize
      // it. Polled because the pane is visible before it is highlighted.
      const code = page.getByTestId('story-source-code')
      await expect(code).toBeVisible()
      await expect.poll(() => code.textContent()).toEqual(expected)
    })
  }
})
