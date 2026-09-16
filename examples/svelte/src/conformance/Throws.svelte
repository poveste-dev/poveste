<script lang="ts">
  // Deliberately broken: the book has to show that this component threw rather
  // than render as if it worked (#323).
  throw new Error('component blew up on purpose')
</script>

<div class="conformance-throws-never">never</div>
