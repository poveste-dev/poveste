<script>
  import WrapperChain from './WrapperChain.svelte'

  const { wrappers, story, variant, component, componentProps } = $props()
  const [Wrapper, ...rest] = $derived(wrappers)
</script>

{#if Wrapper}
  <Wrapper {story} {variant}>
    <WrapperChain wrappers={rest} {story} {variant} {component} {componentProps} />
  </Wrapper>
{:else}
  {@const Component = component}
  <Component {...componentProps} />
{/if}
