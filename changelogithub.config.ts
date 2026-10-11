// `release.yml` appends changelogithub's commit list to every release body. With
// no config it has no `revert` type, so a fix reverted in the same range was
// listed as shipped and its revert was left out (#1197).
export default {
  types: {
    feat: { title: '🚀 Features' },
    fix: { title: '🐞 Bug Fixes' },
    perf: { title: '🏎 Performance' },
    revert: { title: '⏪ Reverts' },
  },
}
