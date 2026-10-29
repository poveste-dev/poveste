<script>
  // jsdom has no `ResizeObserver`; a browser does.
  const observer = new ResizeObserver(() => {})
  observer.disconnect()
</script>

<p>measured</p>
