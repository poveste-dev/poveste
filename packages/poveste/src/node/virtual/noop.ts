import type { Context } from '../context.js'
import { declareEmptySetupFns } from './util.js'

export function noop(ctx: Context) {
  return [
    `export default () => {}`,
    declareEmptySetupFns(ctx),
  ].join('\n')
}
