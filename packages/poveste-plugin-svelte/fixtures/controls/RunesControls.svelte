<script>
  const { Hst } = $props()
  const state = $state({ label: 'start', game: 'a' })
</script>

<Hst.Text bind:value={state.label} title="Label" placeholder="Type here" />
<Hst.Select bind:value={state.game} options={['a', 'b']} title="Game" />
<Hst.Button onclick={() => (state.label = 'reset')}>Reset label</Hst.Button>
<Hst.TokenList tokens={{ a: '1px', b: '2px' }}>
  {#snippet children({ token })}
    <i class="token">{token.key}</i>
  {/snippet}
</Hst.TokenList>
<output>{state.label}</output>
