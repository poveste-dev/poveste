// Holds collection open long enough for a config edit to restart the server
// while this story is still being executed.
await new Promise(resolve => setTimeout(resolve, 3000))

export default {
  title: 'Slow',
  variants: [{ title: 'Default', onMount: () => {} }],
}
