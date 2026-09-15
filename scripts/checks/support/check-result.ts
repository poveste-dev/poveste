/** What a check found in this repository, and what to do about it. */
export interface CheckResult {
  /** Empty when the repository holds up. */
  problems: string[]
  /** How to fix what `problems` names, printed after them. */
  remedy: string
  /** What the check measured on the way, reported whether it passes or not. */
  notes: string[]
}
