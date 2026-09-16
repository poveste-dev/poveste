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

    // Release bodies are built from subjects, so `@layer` at the start becomes
    // a real @-mention of whichever stranger holds that handle.
    'subject-no-bare-at-word': ({ subject }) => [
      !/^@\w/.test(subject ?? ''),
      'subject must not start with a bare @word — write `@layer` in backticks, or "the layer API"',
    ],

  },
}

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [local],
  rules: {
    'header-max-length': [2, 'always', 90],
    'body-max-line-length': [2, 'always', 100],
    'footer-max-line-length': [2, 'always', 100],
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
