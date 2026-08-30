import { parse } from 'svelte/compiler'
import { describe, expect, it } from 'vitest'
import { transformStoryAutoProps } from './auto-props'

const NAME = [{ name: 'name', types: ['string'], default: 'world' }]

function propsOf(props: Record<string, any> = { './Button.svelte': NAME }) {
  return async (specifier: string) => props[specifier]
}

function story(markup: string, script = `import Button from './Button.svelte'`) {
  return `<script>\n  ${script}\n  export let Hst\n</script>\n\n${markup}`
}

describe('a story whose variant renders a component with props', () => {
  it('spreads the control values onto a component that binds nothing', async () => {
    const source = story(`<Hst.Story>\n  <Hst.Variant>\n    <Button />\n  </Hst.Variant>\n</Hst.Story>`)

    const result = await transformStoryAutoProps(source, propsOf())

    expect(result).toContain('<Button {...$__pvtAutoProps[0][0]} />')
  })

  it('spreads after the props the story binds itself, so an untouched control loses', async () => {
    const source = story(`<Hst.Story>\n  <Hst.Variant>\n    <Button name={state.name} />\n  </Hst.Variant>\n</Hst.Story>`)

    const result = await transformStoryAutoProps(source, propsOf())

    expect(result).toContain('<Button name={state.name} {...$__pvtAutoProps[0][0]} />')
  })

  it('numbers components within their own variant, which is how _hPropState is keyed', async () => {
    const source = story(`<Hst.Story>
  <Hst.Variant>
    <Button />
  </Hst.Variant>
  <Hst.Variant>
    <Button />
    <Button />
  </Hst.Variant>
</Hst.Story>`)

    const result = await transformStoryAutoProps(source, propsOf())

    expect(result).toContain('$__pvtAutoProps[0][0]')
    expect(result).toContain('$__pvtAutoProps[1][0]')
    expect(result).toContain('$__pvtAutoProps[1][1]')
  })

  it('treats a story with no explicit variants as variant zero', async () => {
    const source = story(`<Hst.Story>\n  <Button />\n</Hst.Story>`)

    const result = await transformStoryAutoProps(source, propsOf())

    expect(result).toContain('$__pvtAutoProps[0][0]')
  })

  it('reaches a component inside a snippet', async () => {
    const source = story(`<Hst.Story>
  <Hst.Variant>
    {#snippet children({ state })}
      <Button />
    {/snippet}
  </Hst.Variant>
</Hst.Story>`)

    const result = await transformStoryAutoProps(source, propsOf())

    expect(result).toContain('<Button {...$__pvtAutoProps[0][0]} />')
  })

  it('declares what the controls panel renders', async () => {
    const source = story(`<Hst.Story>\n  <Hst.Variant>\n    <Button />\n  </Hst.Variant>\n</Hst.Story>`)

    const result = await transformStoryAutoProps(source, propsOf())

    expect(result).toContain(`{"name":"Button","props":[{"name":"name","types":["string"],"default":"world"}]}`)
    expect(result).toContain('[{...__pvtAutoPropDefs[0],index:0}]')
  })

  // A hundred-variant story carried a hundred copies of the same prop table.
  it('serialises a component used by several variants once', async () => {
    const source = story(`<Hst.Story>
  <Hst.Variant><Button /></Hst.Variant>
  <Hst.Variant><Button /></Hst.Variant>
  <Hst.Variant><Button /></Hst.Variant>
</Hst.Story>`)

    const result = await transformStoryAutoProps(source, propsOf())

    expect(result!.match(/"types":\["string"\]/g)).toHaveLength(1)
    expect(result!.match(/__pvtAutoPropDefs\[0\]/g)).toHaveLength(3)
  })

  it('numbers variants the same whether or not a wrapper stands between them', async () => {
    const wrapped = story(`<Hst.Story>
  <div>
    <Hst.Variant title="A"><Button /></Hst.Variant>
    <Hst.Variant title="B"><Button /></Hst.Variant>
  </div>
</Hst.Story>`)

    const result = await transformStoryAutoProps(wrapped, propsOf())

    expect(result).toContain('$__pvtAutoProps[0][0]')
    expect(result).toContain('$__pvtAutoProps[1][0]')
  })

  it('reaches variants declared inside a story-level snippet', async () => {
    const source = story(`<Hst.Story>
  {#snippet children()}
    <Hst.Variant title="A"><Button /></Hst.Variant>
    <Hst.Variant title="B"><Button /></Hst.Variant>
  {/snippet}
</Hst.Story>`)

    const result = await transformStoryAutoProps(source, propsOf())

    expect(result).toContain('$__pvtAutoProps[0][0]')
    expect(result).toContain('$__pvtAutoProps[1][0]')
  })

  it('keeps the other components when one of them is conditional', async () => {
    const source = story(`<Hst.Story>
  <Hst.Variant title="A"><Button /></Hst.Variant>
  <Hst.Variant title="B">{#if shown}<Button />{/if}</Hst.Variant>
</Hst.Story>`)

    const result = await transformStoryAutoProps(source, propsOf())

    expect(result).toContain('$__pvtAutoProps[0][0]')
    expect(result).not.toContain('$__pvtAutoProps[1]')
  })

  it('escapes a default that would close the script block it lands in', async () => {
    const source = story(`<Hst.Story>\n  <Hst.Variant>\n    <Button />\n  </Hst.Variant>\n</Hst.Story>`)

    const result = await transformStoryAutoProps(source, async () => [{ name: 'html', default: '</script>' }])

    expect(result).not.toContain('</script>\\"')
    expect(() => parse(result!, { modern: true })).not.toThrow()
  })

  it('survives a trailing comment on the type import above the component one', async () => {
    const source = `<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte' // the harness
  import Button from './Button.svelte'

  export let Hst: Hst
</script>

<Hst.Story><Hst.Variant><Button /></Hst.Variant></Hst.Story>`

    const result = await transformStoryAutoProps(source, propsOf())

    expect(result).toContain('$__pvtAutoProps[0][0]')
  })

  it('survives an aliased inline type import', async () => {
    const source = `<script lang="ts">
  import { type Hst as H } from '@poveste/plugin-svelte'
  import Button from './Button.svelte'

  export let Hst: H
</script>

<Hst.Story><Hst.Variant><Button /></Hst.Variant></Hst.Story>`

    const result = await transformStoryAutoProps(source, propsOf())

    expect(result).toContain('$__pvtAutoProps[0][0]')
  })

  // Vue scans only the default slot; a control widget is chrome, not preview.
  it('leaves the components that build the controls panel alone', async () => {
    const source = story(`<Hst.Story>
  <Hst.Variant>
    <Button />
    {#snippet controls()}
      <Button />
    {/snippet}
  </Hst.Variant>
</Hst.Story>`)

    const result = await transformStoryAutoProps(source, propsOf())

    expect(result!.match(/\$__pvtAutoProps\[0\]\[\d\]/g)).toEqual(['$__pvtAutoProps[0][0]'])
  })
})

describe('a TypeScript story', () => {
  // The shape every story in this repo has. `import type { Hst }` beside
  // `export let Hst: Hst` reads as a duplicate declaration unless the type
  // import is erased first, and erasing it must not move any other offset.
  it('is transformed even though its type import shadows a declaration', async () => {
    const source = `<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import Button from './Button.svelte'

  export let Hst: Hst
</script>

<Hst.Story>
  <Hst.Variant>
    <Button />
  </Hst.Variant>
</Hst.Story>`

    const result = await transformStoryAutoProps(source, propsOf())

    expect(result).toContain('<Button {...$__pvtAutoProps[0][0]} />')
    expect(result).toContain(`import type { Hst } from '@poveste/plugin-svelte'`)
  })

  it('is transformed when the type import is written inline', async () => {
    const source = `<script lang="ts">
  import { type Hst } from '@poveste/plugin-svelte'
  import Button from './Button.svelte'

  export let Hst: Hst
</script>

<Hst.Story>
  <Hst.Variant>
    <Button />
  </Hst.Variant>
</Hst.Story>`

    const result = await transformStoryAutoProps(source, propsOf())

    expect(result).toContain('<Button {...$__pvtAutoProps[0][0]} />')
  })
})

describe('a story auto-props must not touch', () => {
  const untouched = async (source: string, props?: Record<string, any>) =>
    expect(await transformStoryAutoProps(source, propsOf(props))).toBeUndefined()

  it('is left alone when its component declares no props', async () => {
    await untouched(
      story(`<Hst.Story>\n  <Hst.Variant>\n    <Button />\n  </Hst.Variant>\n</Hst.Story>`),
      { './Button.svelte': [] },
    )
  })

  it('is left alone when it renders no imported component', async () => {
    await untouched(story(`<Hst.Story>\n  <Hst.Variant>\n    <p>plain</p>\n  </Hst.Variant>\n</Hst.Story>`))
  })

  it('is left alone when its variants come out of a block, which cannot be numbered', async () => {
    await untouched(story(`<Hst.Story>
  {#each items as item}
    <Hst.Variant>
      <Button />
    </Hst.Variant>
  {/each}
</Hst.Story>`))
  })

  it('is left alone when its only component is conditional', async () => {
    await untouched(story(`<Hst.Story>
  <Hst.Variant>
    {#if shown}
      <Button />
    {/if}
  </Hst.Variant>
</Hst.Story>`))
  })

  // A variant a block produces is registered at runtime in an order no static
  // pass can predict, so the whole story is abandoned rather than misnumbered.
  it('is left alone when a variant hides in an await branch', async () => {
    await untouched(story(`<Hst.Story>
  {#await ready then value}
    <Hst.Variant title="B"><Button /></Hst.Variant>
  {/await}
  <Hst.Variant title="A"><Button /></Hst.Variant>
</Hst.Story>`))
  })

  it('is left alone when a variant hides in an each fallback', async () => {
    await untouched(story(`<Hst.Story>
  {#each items as item}
    <p>{item}</p>
  {:else}
    <Hst.Variant title="empty"><Button /></Hst.Variant>
  {/each}
  <Hst.Variant title="real"><Button /></Hst.Variant>
</Hst.Story>`))
  })

  it('does not drive the Hst components themselves', async () => {
    await untouched(
      story(`<Hst.Story>\n  <Hst.Variant>\n    <Hst.Text />\n  </Hst.Variant>\n</Hst.Story>`),
      { './Button.svelte': NAME },
    )
  })

  it('is left alone when it has no script to inject into', async () => {
    await untouched(`<Hst.Story>\n  <Hst.Variant />\n</Hst.Story>`)
  })

  it('is left alone when it has already been transformed', async () => {
    const source = story(`<Hst.Story>\n  <Hst.Variant>\n    <Button />\n  </Hst.Variant>\n</Hst.Story>`)
    const once = await transformStoryAutoProps(source, propsOf())

    expect(await transformStoryAutoProps(once!, propsOf())).toBeUndefined()
  })

  it('is left alone when the source does not parse', async () => {
    await untouched(`<script>` + `\n  import Button from './Button.svelte'\n</script>\n<Hst.Story>`)
  })
})
