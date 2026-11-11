<script>
  export let Hst
  let label = 'start'
</script>

<Hst.Text bind:value={label} title="Label" />
<Hst.Button>Legacy label</Hst.Button>
<Hst.TokenList tokens={{ a: '1px' }} let:token>
  <i class="token">{token.key}</i>
</Hst.TokenList>
<output>{label}</output>
