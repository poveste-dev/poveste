// Scopes are package names first, then the areas that are not packages. The
// table in `.github/commit-convention.md` is the prose copy and says where a
// scope that is not on this list belongs; `scope-enum` warns rather than
// errors, because a scope nobody anticipated is worth a nudge and not a block.
const SCOPES = [
  'app',
  'controls',
  'node',
  'shared',
  'vendors',
  'vue',
  'svelte',
  'nuxt',
  'quasar',
  'percy',
  'screenshot',
  'tailwind',
  'repo',
  'ci',
  'docs',
  'guide',
  'examples',
  'e2e',
  'deps',
]

// Types whose subject may stand alone. 57 of the 209 commits since v0.8.0 are
// `docs` and most are a subject and nothing else; a revert states what it
// reverts in a fixed form. A warning that fires on a quarter of commits is one
// people learn to scroll past, which is the failure this is meant to remove.
const BODY_OPTIONAL_TYPES = ['docs', 'revert']

const local = {
  rules: {
    // `revert: ` plus the original header is the revert format the convention
    // doc prescribes, so measuring it whole makes a legal subject impossible to
    // revert: eight characters the author never chose to spend. An 87-character
    // subject is fine and its revert is 95.
    'header-length-allowing-revert': ({ header }, _when, value) => {
      const written = (header ?? '').replace(/^revert: /, '')

      return [
        written.length <= value,
        `header must not be longer than ${value} characters, current length is ${written.length}`,
      ]
    },

    // Missing and too-short are different mistakes, so they get different
    // advice. Neither message mentions the exemption: "make it a `docs` commit"
    // would be advice to mislabel the change, and someone in a hurry takes it.
    'body-explains-why': ({ type, body }, _when, value) => {
      if (BODY_OPTIONAL_TYPES.includes(type ?? '')) {
        return [true, '']
      }

      const written = (body ?? '').trim().length

      return [
        written >= value,
        written === 0
          ? `a \`${type}\` commit should say why in the body — the diff already says what`
          : `the body is ${written} characters; say why the change was needed, not what it does`,
      ]
    },

    // changelogithub copies the subject into the release body verbatim, and
    // GitHub linkifies an @handle *anywhere* in a line, not only at the start —
    // so `bump @sveltejs/kit` emails whoever holds that account, and cannot be
    // unsent. Backticks are the way out, which is what the convention doc says,
    // so code spans are removed before looking.
    'subject-no-bare-at-word': ({ subject }) => {
      const prose = (subject ?? '').replace(/`[^`]*`/g, '')
      const bare = /@[A-Z0-9][-\w]*/i.exec(prose)

      return [
        bare === null,
        `subject must not contain a bare ${bare?.[0] ?? '@word'} — GitHub reads it as a mention of whoever holds that handle; put it in backticks`,
      ]
    },

  },
}

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [local],
  rules: {
    // Off in favour of the local rule below, which measures the same thing but
    // does not charge a revert for its own prefix. `body-max-line-length` and
    // `footer-max-line-length` are not set here at all: config-conventional
    // already sets both to exactly [2, 'always', 100].
    'header-max-length': [0, 'always', 90],
    'header-length-allowing-revert': [2, 'always', 90],
    // The built-in for the `!` marker. The spec permits `feat(node)!:` as a
    // second spelling of the footer, and two spellings mean a release pass
    // reads one and misses the other.
    'subject-exclamation-mark': [2, 'never'],
    'scope-case': [2, 'always', 'kebab-case'],
    'scope-enum': [1, 'always', SCOPES],
    'body-explains-why': [1, 'always', 20],
    'subject-no-bare-at-word': [2, 'always'],
  },
}
