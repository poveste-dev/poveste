<!--
  Around a story the app renders itself, so the dark class on its render root is
  reachable by the book's CSS (#332).

  A book's CSS is wrapped in `@scope (.__poveste-render-story)`, where a rule
  shaped `.dark .foo` needs `.dark` strictly inside a scope root: on the root
  itself it matches nothing. This is a second root one level out, which makes the
  render root an element inside a scope. The sandbox has the same two levels,
  `body` and `#app` (#101).

  No box, so nothing is laid out differently, and `!important` because a book's
  `:root { display }` rule lands on every scope root. The custom-controls class
  keeps this from being the boundary the chrome's own CSS stops at, which stays
  the render root, as `body` does in the sandbox.
-->
<template>
  <div
    class="__poveste-render-story __poveste-render-custom-controls"
    style="display: contents !important"
  >
    <slot />
  </div>
</template>
