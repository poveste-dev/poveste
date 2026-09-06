/**
 * Emitting values into generated modules.
 *
 * Every generator in this directory builds JavaScript source by interpolation,
 * and most of the values come from somewhere the author of that source did not
 * control — a plugin's id, a user's config key, the project's own path. Getting
 * it wrong produces a syntax error inside a module nobody wrote and nobody can
 * open, which is the symptom rather than a crash at the input (#609).
 *
 * There are two positions and they need different things.
 */

/** A value in a string or key position. Valid JSON is valid JavaScript here. */
export function jsString(value: string): string {
  return JSON.stringify(value)
}

/**
 * A value in an *identifier* position — a binding name, an import name.
 *
 * Quoting cannot help here, so the only honest options are to reject the value
 * or to rename it. These names are read back by consumers (`logos.square`,
 * `generatedSetup.setupVue3`), so renaming would move the problem to whoever
 * looks them up. It rejects, naming the value and where it came from.
 */
export function jsIdentifier(value: string, what: string): string {
  if (!/^[A-Z_$][\w$]*$/i.test(value)) {
    throw new Error(
      `${what} must be usable as a JavaScript identifier, and ${JSON.stringify(value)} is not. `
      + 'It is emitted into a generated module as a binding name, where quoting cannot rescue it.',
    )
  }
  return value
}
