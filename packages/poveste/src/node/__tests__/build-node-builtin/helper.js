import { readFileSync } from 'node:fs'

export function readLabel(file) {
  return readFileSync(file, 'utf8')
}
