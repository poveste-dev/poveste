/** The function that removes `handler` from `handlers`, returned by each `on*` registry. */
export function unregister<T>(handlers: T[], handler: T): () => void {
  return () => {
    const index = handlers.indexOf(handler)
    if (index !== -1) {
      handlers.splice(index, 1)
    }
  }
}
