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

    expect(result).toContain(`[[{"name":"Button","index":0,"props":[{"name":"name","types":["string"],"default":"world"}]}]]`)
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

  it('is left alone when the component it renders is conditional', async () => {
    await untouched(story(`<Hst.Story>
  <Hst.Variant>
    {#if shown}
      <Button />
    {/if}
  </Hst.Variant>
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

  it('is left alone when the source does not parse', async () => {
    await untouched(`<script>` + `\n  import Button from './Button.svelte'\n</script>\n<Hst.Story>`)
  })
})
