<script lang="ts">
  let open = false
</script>

<!--
  `poveste-dropdown` is the class the chrome's own toolbar menus carry, and that
  is the point: a reader's CSS names whatever it likes, including a name we also
  use, and must still not reach the chrome. The vue book proves the harder half
  of this with a popper that teleports out of the story; a Svelte consumer has no
  equivalent library in the book, so this one is inline.

  It used to name floating-vue's classes, which the chrome stopped using in #918
  — so the story went on rendering and stopped colliding with anything.
  `popover-theming.spec.ts` now asserts the collision, so the next rename fails
  rather than quietly emptying this out.
-->
<div class="user-card">
  <button class="trigger" onclick={() => (open = !open)}>Open user dropdown</button>

  {#if open}
    <div class="poveste-dropdown">
      <div class="user-popper">
        <p>This dropdown is owned by the user.</p>
        <p>Background and font should follow user theme, not Poveste's.</p>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.poveste-dropdown) {
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
