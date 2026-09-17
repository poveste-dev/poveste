import type { Context } from '../context.js'
import chokidar from 'chokidar'
import fs from 'fs-extra'
import path from 'pathe'
import pc from 'picocolors'
import { describe, expect, it } from 'vitest'
import { BuildPluginApi, DevPluginApi } from '../plugin.js'

const ctx = {} as Context
const plugin = { name: 'legacy' }
const moduleLoader = { clearCache: () => {}, loadModule: async () => undefined, destroy: () => {} }

// Deprecated in 0.15.0 and removable at 1.0, not before: the policy in
// docs/guide/getting-started.md says an upgrade within 0.x never breaks on one (#356).
describe('the deprecated plugin API members', () => {
  it('still hand over picocolors, pathe and fs-extra to every hook', () => {
    const api = new BuildPluginApi(ctx, plugin, moduleLoader)

    expect(api.colors).toBe(pc)
    expect(api.path).toBe(path)
    expect(api.fs).toBe(fs)
  })

  it('still hands chokidar to onDev', () => {
    expect(new DevPluginApi(ctx, plugin, moduleLoader).watcher).toBe(chokidar)
  })
})
