// Asserts that every published package has a usable npm page.
//
// A package's README.md *is* its page on npmjs.com. #184 is what goes wrong
// when nothing checks them: five published packages had no README at all, and
// the one on `poveste` itself — the first page anyone evaluating the project
// sees — told readers to `pnpm add histoire -D`, installing the unmaintained
// project this one forked.
//
// Three assertions, one per defect actually found:
//   1. it exists                  — five packages had no page
//   2. it says something          — a title alone is not a page
//   3. no `histoire` in a code fence — the install-the-wrong-thing bug
//
// Prose may name histoire freely; being its successor is worth saying. Only
// fenced code is checked, because that is what a reader copies.
//
// No network: dead links are not checkable here.

import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES = join(ROOT, 'packages')

const MIN_LENGTH = 120

const problems: string[] = []
let checked = 0

for (const entry of await readdir(PACKAGES)) {
  const dir = join(PACKAGES, entry)
  if (!(await stat(dir)).isDirectory()) {
    continue
  }

  let manifest: any
  try {
    manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  }
  catch {
    continue
  }

  if (manifest.private) {
    continue
  }

  checked++
  const readmePath = join(dir, 'README.md')

  let readme: string
  try {
    readme = await readFile(readmePath, 'utf8')
  }
  catch {
    problems.push(`${manifest.name} has no README.md — npm renders "This package does not have a README"`)
    continue
  }

  if (readme.trim().length < MIN_LENGTH) {
    problems.push(`${manifest.name}: README.md is ${readme.trim().length} chars, under the ${MIN_LENGTH} minimum`)
  }

  const fences = readme.match(/```[\s\S]*?```/g) ?? []
  for (const fence of fences) {
    if (/\bhistoire\b/.test(fence)) {
      const line = fence.split('\n').find(l => /\bhistoire\b/.test(l))?.trim()
      problems.push(`${manifest.name}: README.md has "histoire" in a code block — readers copy this: ${line}`)
      break
    }
  }
}

if (problems.length > 0) {
  console.error('❌ Published packages with an unusable npm page:\n')
  for (const problem of problems) {
    console.error(`  • ${problem}`)
  }
  process.exit(1)
}

console.log(`✅ all ${checked} published packages have a README`)
