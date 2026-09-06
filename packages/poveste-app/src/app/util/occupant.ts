/**
 * What the sandbox realm is currently showing.
 *
 * The realm is reused: a `SANDBOX_RETARGET` hands it another story rather than
 * booting a new document, so a message can outlive the occupant that queued it.
 * Every message `sandbox.ts` posts already carries these ids for that reason;
 * this module exists so `logEvent` — which posts from wherever a story calls it,
 * not from `sandbox.ts` — can carry them too (#328).
 */
export const occupant: { storyId: string | null, variantId: string | null } = {
  storyId: null,
  variantId: null,
}
