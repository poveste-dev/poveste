import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { BUNDLED_ASSET_ALLOWED, BUNDLED_LICENCES, declaredLicence, licenceProblem } from '../licences.ts'

export const NOTICES_FILE = 'THIRD_PARTY_NOTICES.md'

const BUNDLER = /\b(?:vite build|rolldown|tsdown|rollup)\b/

/** Whether a package's build script runs a bundler, so its `dist` can hold third-party code. */
export function buildBundles(manifest: { scripts?: Record<string, string> }): boolean {
  return BUNDLER.test(manifest.scripts?.['build'] ?? '')
}

// Only the hooks this uses, so the file needs no `vite` of its own: the scripts
// project does not install it, and every Vite plugin has this shape.
interface BundleOutput {
  type: 'chunk' | 'asset'
  modules?: Record<string, { renderedLength: number }>
}
interface NoticesPlugin {
  name: string
  apply: 'build'
  configResolved: (config: { root: string }) => void
  generateBundle: (this: { error: (message: string) => never }, options: unknown, bundle: Record<string, BundleOutput>) => void
  writeBundle: () => void
}

export interface BundledPackage {
  name: string
  version: string
  licence: string | undefined
  /** The licence file's text, which MIT and BSD require to travel with the copy. */
  licenceText: string | undefined
  /** Apache-2.0's NOTICE file, which has to travel too. */
  noticeText: string | undefined
}

const LICENCE_FILE = /^(?:licen[cs]e|copying)(?:[.-].*)?$/i
const NOTICE_FILE = /^notice(?:\..*)?$/i

/** The directory of the installed package a bundled module id belongs to. */
export function packageDirOf(id: string): string | undefined {
  const path = id.replace(/^\0/, '').replace(/[?#].*$/, '')
  const marker = '/node_modules/'
  const at = path.lastIndexOf(marker)
  if (at === -1) {
    return undefined
  }
  const rest = path.slice(at + marker.length).split('/')
  const nameParts = rest[0]?.startsWith('@') ? 2 : 1
  return path.slice(0, at + marker.length) + rest.slice(0, nameParts).join('/')
}

function readFirst(dir: string, pattern: RegExp) {
  const file = readdirSync(dir).find(entry => pattern.test(entry))
  return file ? readFileSync(join(dir, file), 'utf8').trim() : undefined
}

export function readBundledPackage(dir: string): BundledPackage {
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  return {
    name: manifest.name,
    version: manifest.version,
    licence: declaredLicence(manifest),
    licenceText: readFirst(dir, LICENCE_FILE),
    noticeText: readFirst(dir, NOTICE_FILE),
  }
}

export function renderNotices(packageName: string, bundled: BundledPackage[]): string {
  const sections = [...bundled]
    .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))
    .map((pkg) => {
      const parts = [`## ${pkg.name}@${pkg.version}`, '', `Licence: ${pkg.licence}`]
      if (pkg.licenceText) {
        parts.push('', '```', pkg.licenceText, '```')
      }
      if (pkg.noticeText) {
        parts.push('', 'NOTICE:', '', '```', pkg.noticeText, '```')
      }
      return parts.join('\n')
    })
  if (sections.length === 0) {
    return `# Third-party notices\n\n${packageName} bundles no third-party code into its \`dist\`.\n`
  }
  return [
    '# Third-party notices',
    '',
    `${packageName} bundles code from the packages below into its \`dist\`. Each is listed with its version, licence and the licence text it was distributed under.`,
    '',
    ...sections.flatMap(section => [section, '']),
  ].join('\n')
}

/** A third-party file kept in this repository rather than installed, a font for one. */
export interface VendoredFile {
  name: string
  licence: string
  /** Relative to the package root. */
  licenceFile: string
}

/** The installed directory of `name`, found the way Node would from `root`, without NODE_PATH. */
export function installedPackageDir(name: string, root: string): string | undefined {
  for (let dir = root; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) {
      return realpathSync(candidate)
    }
    if (dirname(dir) === dir) {
      return undefined
    }
  }
}

/**
 * Writes `dist/THIRD_PARTY_NOTICES.md` from what the bundle actually contains,
 * and fails the build on a bundled licence outside the allow-list (#936).
 *
 * Read from the rendered modules rather than `package.json`: a dependency the
 * build externalises is not redistributed, and a transitive one it inlines is.
 * What reaches `dist` outside the bundle has to be named: `extra` for packages
 * compiled in by another step, such as Tailwind's CSS, and `vendored` for files
 * kept in the source tree.
 */
export function thirdPartyNotices(options: { packageName: string, extra?: string[], vendored?: VendoredFile[] }): NoticesPlugin {
  let root = process.cwd()
  let notices = ''
  return {
    name: 'poveste:third-party-notices',
    apply: 'build',
    configResolved(config) {
      root = config.root
    },
    generateBundle(_, bundle) {
      const dirs = new Set<string>()
      for (const name of options.extra ?? []) {
        const dir = installedPackageDir(name, root)
        if (!dir) {
          this.error(`${options.packageName} names ${name} as bundled, but it is not installed`)
        }
        dirs.add(dir)
      }
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') {
          continue
        }
        for (const [id, module] of Object.entries(output.modules ?? {})) {
          const dir = packageDirOf(id)
          // CSS reaches the stylesheet asset, so its module renders nothing into the chunk.
          if (dir && (module.renderedLength > 0 || /\.(?:css|pcss|postcss|scss|sass|less)$/.test(id.replace(/[?#].*$/, '')))) {
            dirs.add(realpathSync(dir))
          }
        }
      }
      const installed = [...dirs].map(readBundledPackage)
      const vendored = (options.vendored ?? []).map(file => ({ name: file.name, version: 'vendored', licence: file.licence, licenceText: readFileSync(join(root, file.licenceFile), 'utf8').trim(), noticeText: undefined }))
      const problem = (pkg: BundledPackage, allowed: Record<string, string>, list: string) => {
        const found = licenceProblem(pkg.licence, allowed, list) ?? (pkg.licenceText ? undefined : 'ships no licence file, so its notice cannot travel with the copy')
        return found ? [`${pkg.name}@${pkg.version} ${found}`] : []
      }
      const problems = [
        ...installed.flatMap(pkg => problem(pkg, BUNDLED_LICENCES, 'the allow-list for bundled code')),
        ...vendored.flatMap(pkg => problem(pkg, BUNDLED_ASSET_ALLOWED, 'the allow-list for bundled assets')),
      ]
      if (problems.length > 0) {
        this.error(`${options.packageName} bundles code it may not redistribute:\n${problems.map(p => `  • ${p}`).join('\n')}\nSee the lists in scripts/licences.ts: add the licence with a reason, or stop bundling the package.`)
      }
      const bundled = [...installed, ...vendored]
      notices = renderNotices(options.packageName, bundled)
    },
    // Into `dist` itself: two of the builds write the bundle to `dist/bundled`.
    writeBundle() {
      mkdirSync(join(root, 'dist'), { recursive: true })
      writeFileSync(join(root, 'dist', NOTICES_FILE), notices)
    },
  }
}
