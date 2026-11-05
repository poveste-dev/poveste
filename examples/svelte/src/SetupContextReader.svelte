<script lang="ts">
  import { getContext } from 'svelte'

  const fromFile = getContext('from-setup-file')
  const fromStory = getContext('from-setup-app')
</script>

<p class="setup-context-file">{fromFile}</p>
<p class="setup-context-story">{fromStory}</p>
