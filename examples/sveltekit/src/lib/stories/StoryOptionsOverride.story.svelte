<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<Hst.Story title="StoryOptions Override" icon="carbon:no-image" meta={{ storyOptions: false }}>
  <Hst.Variant>
    <p>This story sets <code>meta.storyOptions: false</code>, which forces the right pane hidden regardless of the global Layout setting.</p>
  </Hst.Variant>
</Hst.Story>
