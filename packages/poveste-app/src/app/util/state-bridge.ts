import { applyState, createStateBaseline, isEquivalent } from '@poveste/shared'

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

    /** The far end sent changes: apply them, and agree to the ones that landed. */
    receive(target: any, changes: any) {
      applyState(target, changes)
      baseline.record(agreedFrom(target, changes))
    },
  }
}

/**
 * Of `changes`, the part `target` actually took.
 *
 * `applyState` swallows a write a setter refuses — a read-only `computed` in
 * state is the case that occurs — and reports it as written anyway. Recording
 * that as agreed is worse than losing it: the far side still holds the old
 * value, its next firing diffs that against a baseline claiming the new one,
 * and it comes back as a fresh edit that reverts the sender. A control edit
 * silently undoing itself, with nothing to show for it.
 *
 * So read the target back. Comparing per nested key as well as per key is what
 * keeps a merged write recordable: `applyState` merges one level, so a narrowed
 * change never equals the whole object it landed in.
 */
function agreedFrom(target: any, changes: any) {
  const agreed: Record<string, any> = {}

  for (const key in changes) {
    const wanted = changes[key]
    const current = target[key]

    if (isEquivalent(current, wanted)) {
      agreed[key] = wanted
      continue
    }

    if (wanted === null || typeof wanted !== 'object' || Array.isArray(wanted)) {
      continue
    }

    if (current === null || typeof current !== 'object') {
      continue
    }

    let landed: Record<string, any> | null = null

    for (const nested in wanted) {
      if (isEquivalent(current[nested], wanted[nested])) {
        landed ??= {}
        landed[nested] = wanted[nested]
      }
    }

    if (landed) {
      agreed[key] = landed
    }
  }

  return agreed
}
