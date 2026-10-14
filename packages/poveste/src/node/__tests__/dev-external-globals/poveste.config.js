export default {
  storyMatch: ['**/*.story.js'],
  // One worker, so the second story is collected after the first has been
  // cleared away, in the realm that already ran the import.
  collectMaxThreads: 1,
}
