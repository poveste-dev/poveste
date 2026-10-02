#!/usr/bin/env node
'use strict'

import process from 'node:process'
import { supportedFrameworks } from './framework-floor.mjs'
import { supportedNode } from './node-floor.mjs'

// Before the CLI is imported, not inside it: on a Node below the floor the import
// itself is one of the things that can fail, and it fails naming neither Node nor
// Poveste — story collection loads jsdom, which answers `webidl.util
// .markAsUncloneable is not a function` on Node 20 (#913).
//
// Imported dynamically for the same reason. A static import is parsed with this
// module, before a line of it runs, so syntax `dist/` may carry would win the race
// against the message explaining it.
// The framework floor goes here for the same reason: on a framework below a
// plugin's peer, importing the CLI fails first and names neither (#1062). Not for
// `--help` or `--version`, which load no command and so cannot reach that failure.
const informational = process.argv.slice(2).some(arg => ['--help', '-h', '--version', '-v'].includes(arg))
if (supportedNode() && (informational || supportedFrameworks())) {
  import('./dist/node/bin.js').catch((error) => {
    // `exitCode`, not `exit`: the error is the last thing written, and forcing the
    // process out on the same tick truncates it on a pipe.
    process.exitCode = 1
    console.error(error)
  })
}
