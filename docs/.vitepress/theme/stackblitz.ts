import type { Project } from '@stackblitz/sdk'
import type { Framework } from './starters'
import sdk from '@stackblitz/sdk'
import { projectFiles, starters, titles } from './starters'

// "Try it live" launches a minimal Poveste book in StackBlitz, built entirely
// in-memory (no pre-created projects or starter repos to maintain — same
// approach as unovis). The starters always install the latest published
// packages from npm; their contents live in `./starters`.

export function launchStackBlitz(framework: Framework): void {
  const build = starters[framework]
  // Markdown attributes are not type-checked, so `<DemoLinks framework="…" />`
  // can still pass a key that no longer exists. Say so — the old silent return
  // made a stale key look like a button that simply does nothing.
  if (!build) {
    console.error(`[poveste docs] unknown starter framework: ${framework}. Expected one of ${Object.keys(starters).join(', ')}.`)
    return
  }
  const starter = build()
  const project: Project = {
    title: titles[framework],
    description: 'A minimal Poveste book — edit a component or its .story file and watch it update live.',
    template: 'node',
    files: projectFiles(starter),
  }
  sdk.openProject(project, { openFile: starter.openFile })
}
