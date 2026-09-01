// Rewrites each mirrored conformance set from its source.
//
// The point of #400's second half: a host should *inherit* the conformance set
// rather than have it hand-written a second time. Symlinks would make drift
// structurally impossible, and were measured to work — a symlinked nuxt4 built
// the same 61 stories and passed all 104 of its e2e. They were not taken because
// they would make two of the four books unbuildable on a Windows checkout without
// `core.symlinks=true`, and the Windows CI job builds `examples/vue3` — the
// canonical book — so CI would not catch it.
//
// So the copy stays, and is generated rather than authored. Adding a host is
// listing it in MIRRORS and running this, not writing 20 files again.

import { copyFileSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { MIRRORS } from './check-mirrored-conformance.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function main(): void {
  let written = 0

  for (const { source, mirror } of MIRRORS) {
    const sourceDir = join(ROOT, source)
    const mirrorDir = join(ROOT, mirror)
    const sourceFiles = readdirSync(sourceDir, { withFileTypes: true }).filter(entry => entry.isFile()).map(entry => entry.name)

    // Remove first: a story deleted from the source has to leave the mirror too,
    // or the mirror keeps a story the shared list no longer knows about.
    for (const entry of readdirSync(mirrorDir, { withFileTypes: true })) {
      if (entry.isFile() && !sourceFiles.includes(entry.name)) {
        rmSync(join(mirrorDir, entry.name))
        console.log(`  removed ${mirror}/${entry.name}`)
      }
    }

    for (const name of sourceFiles) {
      copyFileSync(join(sourceDir, name), join(mirrorDir, name))
      written++
    }
    console.log(`  ${source} → ${mirror} (${sourceFiles.length} files)`)
  }

  console.log(`✅ ${written} conformance stories written across ${MIRRORS.length} mirrored pairs`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
