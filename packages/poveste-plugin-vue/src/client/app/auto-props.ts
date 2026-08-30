import type { AutoPropComponentDefinition, PropDefinition, Variant } from '@poveste/shared'
import { applyState } from '@poveste/shared'
import { getTagName } from '../codegen.js'

export function syncVariantAutoProps(
  variant: Variant,
  vnodes: any,
  externalState: Variant['state'],
  lastSnapshot: string,
) {
  const defs = scanForAutoProps(vnodes, externalState)
  const snapshot = JSON.stringify(defs)

  if (!lastSnapshot || lastSnapshot !== snapshot) {
    applyState(variant.state, {
      _hPropDefs: defs,
    })

    if (!variant.state._hPropState) {
      applyState(variant.state, {
        _hPropState: {},
      })
    }
  }

  return snapshot
}

function scanForAutoProps(vnodes: any, externalState: Variant['state']) {
  const result: AutoPropComponentDefinition[] = []
  const traversalState = {
    index: 0,
  }

  visitVNodes(vnodes, externalState, traversalState, result)

  return result.filter(def => def.props.length)
}

function visitVNodes(vnodes: any, externalState: Variant['state'], traversalState: { index: number }, result: AutoPropComponentDefinition[]) {
  for (const vnode of normalizeVNodes(vnodes)) {
    if (!vnode) continue

    if (typeof vnode.type === 'object') {
      const index = traversalState.index++
      const propDefs: PropDefinition[] = []

      for (const key in vnode.type.props) {
        const prop = vnode.type.props[key]
        let types
        let defaultValue

        if (prop) {
          const rawTypes = Array.isArray(prop.type)
            ? prop.type
            : typeof prop === 'function'
              ? [prop]
              : [prop.type]

          types = rawTypes.map(declaredType)

          defaultValue = typeof prop.default === 'function'
            ? prop.default.toString()
            : prop.default

          // A production build erases the runtime types Vue infers from a
          // type-only `defineProps`, leaving `props: { label: {} }` — so the
          // panel offered a JSON editor for a string (#490). Defaults survive
          // erasure and the passed value is still there, and either is enough to
          // pick a control. A factory default is left alone rather than called.
          if (types.every(type => type === 'unknown')) {
            const evidence = passedValue(vnode, key)
              ?? (typeof prop.default === 'function' ? undefined : prop.default)
            const inferred = inferredType(evidence)
            if (inferred !== 'unknown') {
              types = [inferred]
            }
          }
        }

        propDefs.push({
          name: key,
          types,
          required: prop?.required,
          default: defaultValue,
        })

        if (externalState?._hPropState?.[index]?.[key] != null) {
          if (!vnode.props) {
            vnode.props = {}
          }
          vnode.props[key] = externalState._hPropState[index][key]

          if (!vnode.dynamicProps) {
            vnode.dynamicProps = []
          }

          if (!vnode.dynamicProps.includes(key)) {
            vnode.dynamicProps.push(key)
          }
        }
      }

      result.push({
        name: getTagName(vnode),
        index,
        props: propDefs,
      } as AutoPropComponentDefinition)
    }

    if (Array.isArray(vnode.children)) {
      visitVNodes(vnode.children, externalState, traversalState, result)
    }
  }
}

function declaredType(type: unknown): string {
  switch (type) {
    case String:
      return 'string'
    case Number:
      return 'number'
    case Boolean:
      return 'boolean'
    case Object:
      return 'object'
    case Array:
      return 'array'
    default:
      return 'unknown'
  }
}

/** What the value itself says, when the declaration no longer says anything. */
export function inferredType(value: unknown): string {
  if (Array.isArray(value)) {
    return 'array'
  }
  switch (typeof value) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'object':
      return value === null ? 'unknown' : 'object'
    default:
      return 'unknown'
  }
}

// `vnode.type.props` is keyed as declared and `vnode.props` as authored, so a
// multi-word prop written `my-label` is not found under `myLabel`.
export function passedValue(vnode: any, key: string): unknown {
  const props = vnode.props
  if (!props) {
    return undefined
  }
  return key in props ? props[key] : props[key.replace(/\B([A-Z])/g, '-$1').toLowerCase()]
}

function normalizeVNodes(vnodes: any) {
  if (!Array.isArray(vnodes)) {
    return vnodes == null ? [] : [vnodes]
  }

  const result = []

  for (const vnode of vnodes) {
    if (Array.isArray(vnode)) {
      result.push(...normalizeVNodes(vnode))
    }
    else if (vnode != null) {
      result.push(vnode)
    }
  }

  return result
}
