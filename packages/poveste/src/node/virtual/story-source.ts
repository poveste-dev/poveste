import type { Context } from '../context.js'
import fs from 'fs-extra'
import { resolve } from 'pathe'
import { withPackageImports } from '../util/vendors.js'

export async function storySource(ctx: Context, id: string) {
  const storyId = id.slice('/__resolved__virtual:story-source:'.length)
  const storyFile = ctx.storyFiles.find(f => f.story?.id === storyId)
  if (storyFile) {
    let source: string
    if (storyFile.virtual) {
      source = storyFile.moduleCode ?? ''
    }
    else {
      source = await fs.readFile(resolve(ctx.root, storyFile.relativePath), 'utf-8')
    }
    const code = `let source = ${JSON.stringify(withPackageImports(source))}\nexport { source as default }\n`
    if (ctx.mode !== 'dev') {
      return code
    }
    // A story save that changes no metadata no longer sends a new story list (#1646), so the list
    // keeps handing out the copy of this module it first loaded. Each new copy brings the earlier
    // ones up to date, and tells the Source panel.
    return `${code}if (import.meta.hot?.data) {
  const copies = (import.meta.hot.data.copies ??= [])
  copies.forEach(set => set(source))
  copies.push(value => { source = value })
  if (copies.length > 1 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('poveste:story-source', { detail: ${JSON.stringify(storyId)} }))
  }
  import.meta.hot.accept()
}
`
  }
  return undefined
}
