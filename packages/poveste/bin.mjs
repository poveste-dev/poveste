#!/usr/bin/env node
'use strict'

import process from 'node:process'
import { assertSupportedNode } from './node-floor.mjs'

// Before the CLI is imported, not inside it: on a Node below the floor the import
// itself is one of the things that can fail, and it fails naming neither Node nor
// Poveste — story collection loads jsdom, which answers `webidl.util
// .markAsUncloneable is not a function` on Node 20 (#913).
//
// Imported dynamically for the same reason. A static import is parsed with this
// module, before a line of it runs, so syntax `dist/` may carry would win the race
// against the message explaining it.
assertSupportedNode()

import('./dist/node/bin.js').catch((error) => {
  console.error(error)
  process.exit(1)
})
