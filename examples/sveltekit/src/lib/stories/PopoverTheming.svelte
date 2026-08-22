<script lang="ts">
  let open = false
</script>

<!--
  The vue3 book renders a real floating-vue dropdown here, because a Vue
  consumer can use the same popover library poveste's own chrome does. A Svelte
  consumer cannot, so the popover is hand-rolled — but it carries the same class
  names, which is the part that matters: the restyling below targets the
  selectors poveste's toolbar menus use, and it must not reach them.
-->
<div class="user-card">
  <button class="trigger" onclick={() => (open = !open)}>Open user dropdown</button>

  {#if open}
    <div class="v-popper--theme-dropdown">
      <div class="v-popper__inner">
        <div class="user-popper">
          <p>This dropdown is owned by the user.</p>
          <p>Background and font should follow user theme, not Poveste's.</p>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.v-popper--theme-dropdown) :global(.v-popper__inner) {
    background: navy;
    color: lime;
    border: 3px solid tomato;
    border-radius: 0;
    font-family: monospace;
    padding: 12px;
  }

  .user-popper { min-width: 240px }

  .trigger {
    background: lime;
    color: navy;
    border: 2px dashed tomato;
    padding: 8px 12px;
    font-weight: bold;
    cursor: pointer;
  }
</style>
