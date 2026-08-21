import { applyState, createStateBaseline } from '@poveste/shared'

/**
 * One end of the state bridge between the app and a sandbox iframe.
 *
 * Both ends used to send the *whole* state and tell an echo from a real edit
 * with a boolean meaning "ignore the next firing, it is mine". Two writes in one
 * task then put two messages in flight, each carrying its sender's stale copy of
 * the key the other just changed, and each end applied the other's stale copy
 * over its own fresh one. The two sides ended up disagreeing outright — the
 * controls panel showing one value, the story another, with nothing left in
 * flight to settle it. Same defect as #96 in `plugin-vue`, one transport out.
 *
 * So each end keeps a baseline of what both sides have agreed on, and sends only
 * what its own side changed since. Nothing stale is ever sent, so nothing stale
 * can be applied — and an echo diffs to nothing, which is what retires the flag.
 *
 * Unlike `plugin-vue`, the two ends cannot share one baseline: they are in
 * different documents. Each holds its own and records what arrives, which is
 * what `record` is for.
 */
export function createStateBridge(post: (changes: Record<string, any>) => void) {
  const baseline = createStateBaseline()

  return {
    /**
     * This side's state moved. Sends what changed, or nothing if the move was
     * this end applying what the far end sent.
     */
    send(next: any) {
      const changes = baseline.take(next)

      if (changes) {
        post(changes)
      }
    },

    /** The far end sent changes: apply them, and treat them as agreed. */
    receive(target: any, changes: any) {
      applyState(target, changes)
      baseline.record(changes)
    },
  }
}
