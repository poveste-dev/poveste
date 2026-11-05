// `Conformance/Wrapper` carries this key in every book. This one has no wrapper to read it.
import 'poveste'

declare module 'poveste' {
  interface CommonMeta {
    wrapper?: boolean
  }
}
