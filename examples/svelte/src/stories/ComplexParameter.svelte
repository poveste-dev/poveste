<script lang="ts">
  export let complexParameter: Array<{ action: () => void }> = []
  export let recursiveParameter: { name: string } & Record<string, unknown>
</script>

<div class="native-story" onclick={() => complexParameter[0]?.action()} role="presentation">
  Custom click
</div>
<div>{recursiveParameter.name}</div>

<style>
  .native-story {
    color: var(--histoire-contrast-color);
  }
</style>
