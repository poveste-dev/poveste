import type { Chunk } from '../checks/bundle-size.ts'
import { describe, expect, it } from 'vitest'
import { consumerChunkProblems, VENDOR_MAX_KB } from './consumer-chunks.ts'

const lazy: Chunk[] = [
  { name: 'vendor-B4e_t30I.js', kb: 715 },
  { name: 'HstJson-D83KEa9o.es-C2Z07zlT.js', kb: 438 },
  { name: 'HstDate-Ct5Jp_ZD.es-D-DfhmhX.js', kb: 122 },
  { name: 'HstColor-DHgxKTkm.es-nA_XCBhX.js', kb: 60 },
]

describe('consumerChunkProblems', () => {
  it('passes a book whose controls are lazy and whose vendor is under its ceiling', () => {
    expect(consumerChunkProblems(lazy)).toEqual([])
  })

  it('names each control that is not a chunk of its own', () => {
    const problems = consumerChunkProblems(lazy.filter(chunk => !chunk.name.startsWith('HstDate')))

    expect(problems).toEqual([expect.stringContaining('no `HstDate` chunk')])
  })

  it('names a vendor chunk over its ceiling', () => {
    const problems = consumerChunkProblems([{ name: 'vendor-B4e_t30I.js', kb: VENDOR_MAX_KB + 1 }, ...lazy.slice(1)])

    expect(problems).toEqual([`vendor-B4e_t30I.js is ${VENDOR_MAX_KB + 1} KB, over its ${VENDOR_MAX_KB} KB ceiling`])
  })

  it('fails a book with no vendor chunk, rather than checking nothing', () => {
    expect(consumerChunkProblems(lazy.slice(1))).toEqual([expect.stringContaining('no `vendor` chunk')])
  })

  it('reads only scripts, so a stylesheet named like a control is not one', () => {
    const problems = consumerChunkProblems([...lazy.filter(chunk => !chunk.name.startsWith('HstColor')), { name: 'HstColor-x.css', kb: 1 }])

    expect(problems).toEqual([expect.stringContaining('no `HstColor` chunk')])
  })
})
