// In `src`, the only place this book's `tsconfig.json` looks.
import 'poveste'

declare module 'poveste' {
  interface CommonMeta {
    /** Set to `false` to turn off `WrapperGlobal`'s styling. */
    wrapper?: boolean
  }
}
