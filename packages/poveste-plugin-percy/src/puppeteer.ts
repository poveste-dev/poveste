import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export interface LoadedPuppeteer {
  puppeteer: typeof import('puppeteer')
  /** `puppeteer/<version>`, which Percy stores against every snapshot. */
  environmentInfo: string
}

async function importPuppeteer(): Promise<LoadedPuppeteer> {
  const puppeteer = await import('puppeteer')
  const pkg = require('puppeteer/package.json')
  return { puppeteer, environmentInfo: `${pkg.name}/${pkg.version}` }
}

/**
 * puppeteer is an optional peer as of #455, so it is absent on a perfectly valid
 * install and the first thing to notice is a CI `percy exec` run, where a bare
 * resolution error names neither the package that wanted it nor the way out.
 *
 * Every failure gets that message rather than only the two resolution codes: a
 * runtime that words a missing module differently would otherwise fall through
 * to the obscure error this exists to replace. The original travels as `cause`,
 * which `console.error` prints, so a puppeteer that is installed but broken
 * still says what is actually wrong.
 */
export async function loadPuppeteer(load = importPuppeteer): Promise<LoadedPuppeteer> {
  try {
    return await load()
  }
  catch (error) {
    throw new Error('@poveste/plugin-percy needs `puppeteer` to take snapshots, and it is a peer dependency you install yourself. Run `npm i -D puppeteer` (or the pnpm/yarn equivalent), or unset PERCY_TOKEN to build without Percy.', { cause: error })
  }
}
