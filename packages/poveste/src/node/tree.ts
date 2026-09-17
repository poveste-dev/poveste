import type {
  PovesteConfig,
  ServerStoryFile,
  ServerTree,
  ServerTreeFile,
  TreeGroupConfig,
} from '@poveste/shared'
import pc from 'picocolors'

export function createPath(config: PovesteConfig, file: ServerTreeFile) {
  const treeFile = config.tree.file

  if (typeof treeFile === 'function') {
    return treeFile(file)
  }

  if (treeFile === 'path') {
    const paths = file.path.split('/').slice(0, -1)

    // check if tree file path is a plugin
    const index = paths.findIndex(p => p.includes('.poveste'))

    if (index !== -1) {
      return ['plugins', file.title]
    }

    return [...paths, file.title]
  }

  // `'title'`, which is also the default.
  return file.title.split('/')
}

export function makeTree(config: PovesteConfig, files: ServerStoryFile[]) {
  interface ITreeObject {
    [index: string]: number | ITreeObject
  }

  interface ITreeGroup {
    groupConfig?: TreeGroupConfig
    treeObject: ITreeObject
  }

  const groups: ITreeGroup[] = config.tree?.groups?.map(g => ({
    groupConfig: g,
    treeObject: {},
  })) || []
  const defaultGroup = {
    treeObject: {},
  }
  groups.push(defaultGroup)

  files.forEach((file, index) => {
    // A file only has a tree path once collection found its story.
    if (!file.treePath) {
      return
    }
    const group = getGroup(file)
    setPath(file.treePath, index, group.treeObject)
  })

  let sortingFunction = (a: string, b: string) => a.localeCompare(b)

  if (typeof config.tree.order === 'function') {
    sortingFunction = config.tree.order
  }

  const result: ServerTree = []

  for (const group of groups) {
    if (!group.groupConfig) {
      result.push(...buildTree(group.treeObject))
    }
    else {
      result.push({
        group: true,
        id: group.groupConfig.id,
        title: group.groupConfig.title,
        children: buildTree(group.treeObject),
      })
    }
  }

  return result

  function getGroup(file: ServerStoryFile): ITreeGroup {
    const groupId = file.story?.group
    if (groupId) {
      const group = groups.find(g => g.groupConfig?.id === groupId)
      if (group) {
        return group
      }
      else {
        console.error(pc.red(`Group ${groupId} not found for story ${file.path}`))
      }
    }
    for (const group of groups) {
      if (file.treeFile && group.groupConfig?.include && group.groupConfig.include(file.treeFile)) {
        return group
      }
    }
    return defaultGroup
  }

  function setPath(path: string[], value: number, tree: ITreeObject) {
    let subtree = tree
    for (const [i, key] of path.entries()) {
      if (i === path.length - 1) {
        setKey(subtree, key, value)
        break
      }
      let child = subtree[key]
      if (typeof child !== 'object') {
        // A leaf already at this key keeps its entry under a suffixed key, and
        // the key becomes a folder.
        if (typeof child === 'number') {
          setKey(subtree, key, child)
        }
        child = subtree[key] = {}
      }
      subtree = child
    }
  }

  function setKey(tree: ITreeObject, key: string, value: number | ITreeObject) {
    if (isUndefined(tree[key])) {
      tree[key] = value
      return
    }

    let copyNumber = 1

    while (!isUndefined(tree[`${key}-${copyNumber}`])) {
      copyNumber++
    }

    tree[`${key}-${copyNumber}`] = value

    function isUndefined(element: unknown) {
      return element === undefined
    }
  }

  function buildTree(treeObject: ITreeObject): ServerTree {
    const tree: ServerTree = []

    for (const [key, element] of Object.entries(treeObject)) {
      if (Number.isInteger(element)) {
        tree.push({
          title: key,
          index: element as number,
        })
      }
      else {
        tree.push({
          title: key,
          children: buildTree(element as ITreeObject),
        })
      }
    }

    tree.sort((a, b) => sortingFunction(a.title, b.title))

    return tree
  }
}
