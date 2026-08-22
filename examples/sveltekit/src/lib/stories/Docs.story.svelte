<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<!-- The prose lives in the sibling `Docs.story.md`; the Vue plugin's `<docs>`
     block has no Svelte equivalent, and a same-named `.story.md` is how this
     plugin already does it. -->
<Hst.Story title="Docs" icon="carbon:notebook">
  <Hst.Variant title="default">I have docs!</Hst.Variant>
</Hst.Story>
