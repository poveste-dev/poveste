import type { DocgenEngineOptions } from './engine.js'
import type { DocgenRequest, DocgenResponse } from './protocol.js'
import { parentPort, workerData } from 'node:worker_threads'
import { createDocgenEngine } from './engine.js'

const engine = createDocgenEngine(workerData as Pick<DocgenEngineOptions, 'root' | 'extractors'>)

parentPort!.on('message', async (message: DocgenRequest) => {
  let response: DocgenResponse
  switch (message.type) {
    case 'extract':
      response = { id: message.id, results: await engine.extract(message.requests), stats: { ...engine.stats } }
      break
    case 'update':
      await engine.update(message.file)
      response = { id: message.id }
      break
    case 'dispose':
      await engine.dispose()
      response = { id: message.id }
      break
  }
  parentPort!.postMessage(response)
})
