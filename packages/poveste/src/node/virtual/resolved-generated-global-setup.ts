import type { Context } from '../context.js'
import { GENERATED_SETUP_CODE } from './index.js'
import { declareEmptySetupFns, getSetupFnGroups, ID_SEPARATOR } from './util.js'

export function resolvedGeneratedGlobalSetup(ctx: Context) {
  if (ctx.config.setupCode) {
    const groups = getSetupFnGroups(ctx)
    const canonicals = new Set(groups.map(g => g.canonical))
    return [
      // Import
      `${ctx.config.setupCode.map((c, index) => `import * as setup_${index} from '${GENERATED_SETUP_CODE}${ID_SEPARATOR}${index}'`).join('\n')}`,
      // List
      `const setupList = [${ctx.config.setupCode.map((c, index) => `setup_${index}`).join(', ')}]`,
      // Setups: one real function per plugin, under its canonical name only.
      ...groups.map(g => `export async function ${g.canonical} (payload) {
        for (const setup of setupList) {
          if (setup?.${g.canonical}) {
            await setup.${g.canonical}(payload)
          }
        }
      }`),
      // Aliases are declared `undefined`, not emitted as functions: only the
      // canonical hook is callable, so `getSetupHook` sees one hook in our own
      // generated module rather than warning that it exports two aliases (#231).
      ...[...new Set(groups.flatMap(g => g.aliases))]
        .filter(name => !canonicals.has(name))
        .map(name => `export const ${name} = undefined`),
    ].join('\n')
  }
  else {
    return declareEmptySetupFns(ctx)
  }
}
