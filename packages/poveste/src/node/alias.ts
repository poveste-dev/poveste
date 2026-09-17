import { createRequire } from 'node:module'
import path from 'pathe'

const require = createRequire(import.meta.url)

export const APP_PATH = path.join(path.dirname(require.resolve('@poveste/app/package.json')), process.env['POVESTE_DEV'] ? 'src' : 'dist')

export const TEMP_PATH = path.join(process.cwd(), 'node_modules', '.poveste')
