<script lang="ts">
  export let msg: string = ''
</script>

<div class="greetings">
  <h1 class="green">{msg}</h1>
  <h3>
    You’ve successfully created a project with
    <a target="_blank" href="https://vitejs.dev/">Vite</a> +
    <a target="_blank" href="https://svelte.dev/">Svelte</a>.
  </h3>
</div>

<style lang="scss">
  h1 {
    font-weight: 500;
    font-size: 2.6rem;
    top: -10px;
  }

  h3 {
    font-size: 1.2rem;
  }

  .greetings h1,
  .greetings h3 {
    text-align: center;
  }
</style>
