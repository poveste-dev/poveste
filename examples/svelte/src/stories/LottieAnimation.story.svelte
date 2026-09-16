<script lang="ts">
  import type { Hst } from '@poveste/plugin-svelte'
  import { isCollecting } from 'poveste/client'
  import { onMount } from 'svelte'

  export let Hst: Hst

  let el: HTMLDivElement | undefined

  onMount(async () => {
    // `isCollecting` is the guard that matters here: collection runs the story
    // in a worker with no real DOM, and lottie reaches for one on load.
    if (isCollecting() || !el) return

    const { default: lottie } = await import('lottie-web')

    lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/lottie-data.json',
    })
  })
</script>

<Hst.Story>
  <div bind:this={el} class="lottie"></div>
</Hst.Story>

<style>
  .lottie {
    margin: auto;
    width: 90vw;
    height: 90vh;
    overflow: hidden;
  }
</style>
