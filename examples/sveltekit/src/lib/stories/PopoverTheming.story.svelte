<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import PopoverTheming from './PopoverTheming.svelte'

  export let Hst: Hst
</script>

<Hst.Story title="Style Isolation/Popover theming" layout={{ type: 'grid', width: 360 }}>
  <Hst.Variant title="user-themed">
    <PopoverTheming />
  </Hst.Variant>
</Hst.Story>
