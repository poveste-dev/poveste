<script lang="ts">
  const { label, tone = 'info' }: { label: string, tone?: 'info' | 'warn' } = $props()
</script>

<span class="badge badge-{tone}">{label}</span>
