// X does not accept webm, so the post needs an mp4 of the same recording. The
// conversion is here rather than in a maintainer's shell history, and it is
// skipped rather than fatal when ffmpeg is missing — the webm is the artifact
// the README and the docs use, and it is already written by the time this runs.

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WEBM = join(ROOT, 'docs/public/quasar-demo.webm')
const MP4 = join(ROOT, 'media/quasar-demo.mp4')

if (!existsSync(WEBM)) {
  console.error(`❌ ${WEBM} is missing — run the recorder first`)
  process.exit(1)
}

if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) {
  console.log('⏭️  ffmpeg not installed, so no mp4 was written.')
  console.log(`   The webm is at docs/public/quasar-demo.webm; for X, run:`)
  console.log(`   ffmpeg -i docs/public/quasar-demo.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart media/quasar-demo.mp4`)
  process.exit(0)
}

// `yuv420p` and `+faststart` are what make it play on X and in Safari rather
// than downloading as a file.
const convert = spawnSync('ffmpeg', [
  '-y',
  '-i',
  WEBM,
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  MP4,
], { stdio: 'inherit' })

if (convert.status !== 0) {
  console.error('❌ ffmpeg failed')
  process.exit(1)
}

console.log(`✅ ${MP4}`)
