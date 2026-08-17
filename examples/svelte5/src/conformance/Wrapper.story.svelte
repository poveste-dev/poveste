<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'

  export let Hst: Hst
</script>

<!--
  The Vue side of this story carries `meta={{ wrapper: false }}` on the story and
  `{{ wrapper: true }}` on the second variant. The Svelte plugin has no `meta`
  prop on either — `Story.svelte` exports title, id, group, layout, icon,
  iconColor, docsOnly and initState, and nothing else — so the contract item is
  unmet here rather than merely unwritten. The id exists so the drift guard
  still sees a complete set; a shared wrapper spec cannot run against it yet.
-->
<Hst.Story id="conformance-wrapper" title="Conformance/Wrapper">
  <Hst.Variant id="story-meta" title="story meta">
    <p class="conformance-wrapper-text">Story-level wrapper meta</p>
  </Hst.Variant>
  <Hst.Variant id="variant-meta" title="variant meta">
    <p class="conformance-wrapper-text">Variant-level wrapper meta</p>
  </Hst.Variant>
</Hst.Story>
