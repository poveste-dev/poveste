<script setup lang="ts">
import { Dropdown } from 'floating-vue'
import 'floating-vue/dist/style.css'
</script>

<template>
  <div class="user-card">
    <Dropdown>
      <button class="trigger">
        Open user dropdown
      </button>
      <template #popper>
        <div class="poveste-dropdown user-popper">
          <p>This dropdown is owned by the user.</p>
          <p>Background and font should follow user theme, not Poveste's.</p>
        </div>
      </template>
    </Dropdown>
  </div>
</template>

<style>
/*
 * floating-vue is the *reader's* choice here, not ours — the chrome stopped
 * using it in #918. It stays because it teleports: the popper leaves the story's
 * subtree for `document.body`, which is the case `@scope` makes hard and the one
 * `docs/guide/css.md` warns about. The Svelte books render the same
 * demonstration inline.
 *
 * `poveste-dropdown` is the class the chrome's own toolbar menus carry. A
 * reader's CSS names whatever it likes, including a name we also use, and must
 * still not reach the chrome. These rules used to name floating-vue's classes,
 * which stopped colliding with anything the day the chrome left the library —
 * `popover-theming.spec.ts` now asserts the collision so that cannot happen
 * silently again.
 */
.poveste-dropdown {
  background: navy;
  color: lime;
  border: 3px solid tomato;
  border-radius: 0;
  font-family: monospace;
  padding: 12px;
}

.user-popper {
  min-width: 240px;
}

.trigger {
  background: lime;
  color: navy;
  border: 2px dashed tomato;
  padding: 8px 12px;
  font-weight: bold;
  cursor: pointer;
}
</style>
