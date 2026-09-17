// Runs publint on one packed tarball and prints its errors as JSON lines of text.
// A separate process because publint's API is async and the checks are not.
import { readFileSync } from 'node:fs'
import { publint } from 'publint'
import { formatMessage } from 'publint/utils'

const [tarballPath] = process.argv.slice(2)
if (!tarballPath) {
  throw new Error('usage: publint-tarball.ts <tarball>')
}
const bytes = readFileSync(tarballPath)
const tarball = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
const { messages, pkg } = await publint({ pack: { tarball }, level: 'error' })
const errors = messages
  .filter(message => message.type === 'error')
  .map(message => formatMessage(message, pkg, { color: false }) ?? message.code)
process.stdout.write(JSON.stringify(errors))
