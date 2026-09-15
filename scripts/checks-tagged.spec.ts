import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SUBJECT_TAGS } from './checks/tag-names.mts'

const CHECKS = join(import.meta.dirname, 'checks')

function declaredTags(file: string): string[] {
  const list = readFileSync(join(CHECKS, file), 'utf8').match(/\btags: \[([^\]]*)\]/)?.[1] ?? ''
  return [...list.matchAll(/'([\w-]+)'/g)].map(match => match[1])
}

describe.each(readdirSync(CHECKS).filter(file => file.endsWith('.check.ts')))('%s', (file) => {
  it('carries a subject tag, so no subject filter skips it', () => {
    expect(declaredTags(file).filter(tag => tag in SUBJECT_TAGS)).not.toHaveLength(0)
  })
})
