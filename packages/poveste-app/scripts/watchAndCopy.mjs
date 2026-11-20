import chokidar from 'chokidar'
import fs from 'fs-extra'
import { normalizePath } from 'vite'

function toDist(file) {
  return normalizePath(file).replace(/^src\//, 'dist/')
}

// copy non ts files, such as an html or css, to the dist directory whenever
// they change. chokidar has taken no globs since v4, so filter in `ignored`.
chokidar
  .watch('src', { ignored: file => /(?:\.ts|\.vue|(?:^|[\\/])tsconfig\.json)$/.test(file) })
  .on('change', file => fs.copy(file, toDist(file)))
  .on('add', file => fs.copy(file, toDist(file)))
  .on('unlink', file => fs.remove(toDist(file)))
