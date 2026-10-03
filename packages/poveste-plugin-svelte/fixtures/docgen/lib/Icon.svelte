<script lang="ts">
  interface Props {
    /** Which glyph to draw. */
    name: string
  }
  const { name }: Props = $props()
</script>

<i data-icon={name}></i>
