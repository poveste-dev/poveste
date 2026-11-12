<script lang="ts" setup>
import type { Story, Variant } from '../../types'
import { computed } from 'vue'
import { usePreviewSettingsStore } from '../../stores/preview-settings'
import { a11yRunnerFor, allDisabled, disabledRules, SANDBOX_DISABLED_RULES } from '../../util/a11y'
import { useA11yCheck } from '../../util/a11y-check'
import { povesteConfig } from '../../util/config'

const props = defineProps<{
  story: Story
  variant: Variant
}>()

const settings = usePreviewSettingsStore().currentSettings

const rules = computed(() => disabledRules(povesteConfig.a11y, props.story.a11y))

// A grid can hold dozens of sandboxes, and the check is the reader's to ask for there.
const automatic = computed(() => props.story.layout?.type !== 'grid')

// As the previews decide it: a single story by `iframe`, a grid by `iframeGrid` or the book's isolation.
const inPage = computed(() => {
  const layout = props.story.layout
  if (layout?.type === 'grid') {
    return !(layout.iframeGrid ?? povesteConfig.isolateStyles !== false)
  }
  return layout?.type === 'single' && layout.iframe === false
})

const unavailableNote = computed(() => {
  if (inPage.value) return 'This story renders in the page, not in a sandbox, so there is no document of its own to check.'
  return automatic.value ? 'No sandbox shows this variant right now.' : 'No sandbox shows this variant right now. Scroll it into view in the grid.'
})

const { status, result, error, run } = useA11yCheck({
  runner: () => a11yRunnerFor(props.story.id, props.variant.id),
  disabledRules: () => allDisabled(rules.value),
  automatic: () => automatic.value,
  changes: () => [props.variant.state, settings, rules.value],
})

const summary = computed(() => {
  if (status.value === 'running' && !result.value) return 'Checking…'
  if (status.value === 'error') return 'The check failed'
  if (!result.value) return 'Checks this variant with axe-core when asked'
  const count = result.value.violations.length
  return count === 0 ? 'No violations found' : `${count} violation${count === 1 ? '' : 's'}`
})

const offCount = computed(() => allDisabled(rules.value).length)
</script>

<template>
  <div
    class="poveste-story-a11y"
    data-testid="story-a11y"
    :data-status="status"
  >
    <p
      v-if="status === 'unavailable'"
      data-slot="note"
    >
      {{ unavailableNote }}
    </p>

    <template v-else>
      <div data-slot="header">
        <p
          role="status"
          data-slot="summary"
          data-testid="a11y-summary"
        >
          {{ summary }}<span
            v-if="result"
            data-slot="engine"
          > · axe-core {{ result.engine }}</span>
        </p>
        <button
          type="button"
          data-slot="run"
          :disabled="status === 'running'"
          @click="run()"
        >
          {{ result || error ? 'Check again' : 'Check this variant' }}
        </button>
      </div>

      <p
        v-if="status === 'error'"
        data-slot="error"
      >
        {{ error }}
      </p>

      <ul
        v-if="result?.violations.length"
        data-slot="violations"
      >
        <li
          v-for="violation of result.violations"
          :key="violation.id"
          data-slot="violation"
          data-testid="a11y-violation"
          :data-rule="violation.id"
          :data-impact="violation.impact ?? undefined"
        >
          <div data-slot="violation-header">
            <code data-slot="rule">{{ violation.id }}</code>
            <span
              v-if="violation.impact"
              data-slot="impact"
            >{{ violation.impact }}</span>
          </div>
          <a
            :href="violation.helpUrl"
            target="_blank"
            rel="noopener"
            data-slot="help"
          >{{ violation.help }}</a>
          <ul data-slot="nodes">
            <li
              v-for="(node, index) of violation.nodes"
              :key="index"
              data-slot="node"
            >
              <code data-slot="target">{{ node.target }}</code>
              <pre data-slot="html"><code>{{ node.html }}</code></pre>
            </li>
          </ul>
        </li>
      </ul>

      <p
        v-if="result?.unknownRules.length"
        data-slot="unknown"
      >
        Not axe-core rules, so nothing was skipped for them: {{ result.unknownRules.join(', ') }}
      </p>

      <details data-slot="rules-off">
        <summary>{{ offCount }} rules not run</summary>
        <dl>
          <template
            v-for="id of rules.sandbox"
            :key="id"
          >
            <dt><code>{{ id }}</code></dt>
            <dd>{{ SANDBOX_DISABLED_RULES[id] }}</dd>
          </template>
          <template
            v-for="id of rules.book"
            :key="`book-${id}`"
          >
            <dt><code>{{ id }}</code></dt>
            <dd>Turned off for the book, in its config.</dd>
          </template>
          <template
            v-for="id of rules.story"
            :key="`story-${id}`"
          >
            <dt><code>{{ id }}</code></dt>
            <dd>Turned off for this story.</dd>
          </template>
        </dl>
      </details>
    </template>
  </div>
</template>

<style scoped>
.poveste-story-a11y {
  padding: 1rem;
  font-size: .875rem;
  color: var(--color-gray-800);

  /* On the subject, not `.ptw-dark &`: `.ptw-dark` sits above the `@scope` root (#101). */
  &:where(.ptw-dark, .ptw-dark *) {
    color: var(--color-gray-200);
  }
}

[data-slot='header'] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  margin-bottom: 1rem;
}

[data-slot='summary'] {
  font-weight: 500;
}

[data-slot='engine'] {
  font-weight: 400;
  color: var(--color-gray-600);

  &:where(.ptw-dark, .ptw-dark *) {
    color: var(--color-gray-400);
  }
}

[data-slot='run'] {
  padding: .25rem .625rem;
  border-radius: .25rem;
  background-color: var(--color-primary-200);
  cursor: pointer;

  &:hover {
    background-color: var(--color-primary-300);
  }

  &:disabled {
    cursor: progress;
    opacity: .7;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 1px;
  }

  &:where(.ptw-dark, .ptw-dark *) {
    background-color: var(--color-primary-800);

    &:hover {
      background-color: var(--color-primary-700);
    }
  }
}

[data-slot='note'],
[data-slot='error'],
[data-slot='unknown'] {
  margin-bottom: 1rem;
}

[data-slot='error'] {
  color: var(--color-red-700);

  &:where(.ptw-dark, .ptw-dark *) {
    color: var(--color-red-300);
  }
}

[data-slot='violations'],
[data-slot='nodes'] {
  list-style: none;
  margin: 0;
  padding: 0;
}

[data-slot='violation'] {
  padding: .75rem 0;
  border-top: 1px solid var(--color-gray-200);

  &:where(.ptw-dark, .ptw-dark *) {
    border-color: var(--color-gray-750);
  }
}

[data-slot='violation-header'] {
  display: flex;
  align-items: baseline;
  gap: .5rem;
}

[data-slot='impact'] {
  font-size: .75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .025em;
  color: var(--color-gray-600);

  &:where(.ptw-dark, .ptw-dark *) {
    color: var(--color-gray-400);
  }
}

[data-impact='critical'] [data-slot='impact'],
[data-impact='serious'] [data-slot='impact'] {
  color: var(--color-red-700);

  &:where(.ptw-dark, .ptw-dark *) {
    color: var(--color-red-300);
  }
}

[data-slot='help'] {
  display: inline-block;
  margin-top: .25rem;
  color: var(--color-primary-700);
  text-decoration: underline;

  &:where(.ptw-dark, .ptw-dark *) {
    color: var(--color-primary-300);
  }
}

[data-slot='nodes'] {
  margin-top: .5rem;
}

[data-slot='node'] + [data-slot='node'] {
  margin-top: .5rem;
}

code {
  font-size: .8125rem;
  background-color: var(--color-gray-100);
  border-radius: .25rem;
  padding: 0 .25rem;
  overflow-wrap: anywhere;

  &:where(.ptw-dark, .ptw-dark *) {
    background-color: var(--color-gray-750);
  }
}

pre code {
  display: block;
  padding: .5rem;
  margin-top: .25rem;
  white-space: pre-wrap;
}

[data-slot='rules-off'] {
  margin-top: 1rem;
  color: var(--color-gray-600);

  &:where(.ptw-dark, .ptw-dark *) {
    color: var(--color-gray-400);
  }

  summary {
    cursor: pointer;
  }

  dl {
    margin-top: .5rem;
  }

  dd {
    margin: .125rem 0 .5rem;
  }
}
</style>
