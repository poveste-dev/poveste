<script>
  export let Hst
  export let count
</script>

<Hst.Story>
  {#each Array.from({ length: count }, (_, i) => i + 1) as n (n)}
    <Hst.Variant>
      <p>Button {n}</p>
    </Hst.Variant>
  {/each}
</Hst.Story>
