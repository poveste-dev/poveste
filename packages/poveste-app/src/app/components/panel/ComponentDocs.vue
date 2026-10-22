<script lang="ts" setup>
import type { DocProp } from '@poveste/shared'
import type { ComponentDocsEntry } from '../../util/component-docs'
import { computed } from 'vue'
import { modelLabel, OPEN_PARTS, rootFirst, tagHref, tagText } from '../../util/component-docs'

const props = defineProps<{
  components: ComponentDocsEntry[]
  /** The story's file, which names the family whose root opens first. */
  storyFile?: string | undefined
}>()

const ordered = computed(() => rootFirst(props.components, props.storyFile))

function shownDefault(prop: DocProp) {
  return prop.default ?? prop.defaultTag
}
</script>

<template>
  <div
    class="poveste-component-docs"
    data-testid="component-docs"
  >
    <details
      v-for="(component, index) of ordered"
      :key="component.file"
      :open="ordered.length <= OPEN_PARTS || index === 0"
      data-slot="component"
      :data-component="component.name"
    >
      <summary>
        <h3 data-slot="component-name">
          {{ component.name }}
        </h3>
      </summary>

      <p
        v-if="component.error"
        data-slot="error"
      >
        Could not read this component's types: {{ component.error }}
      </p>

      <template v-else-if="component.doc">
        <table
          v-if="component.doc.props.length"
          data-slot="props"
        >
          <thead>
            <tr>
              <th>Prop</th>
              <th>Type</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="prop of component.doc.props"
              :key="prop.name"
              :data-prop="prop.name"
            >
              <td>
                <code
                  :class="{ deprecated: tagText(prop.tags, 'deprecated') !== undefined }"
                >{{ prop.name }}</code><span
                  v-if="prop.required"
                  title="Required"
                  data-slot="required"
                >*</span>
                <code
                  v-if="modelLabel(component.doc, prop.name)"
                  :title="`Bound two ways with ${modelLabel(component.doc, prop.name)}, through the update:${prop.name} event`"
                  data-slot="model"
                >{{ modelLabel(component.doc, prop.name) }}</code>
              </td>
              <td><code>{{ prop.type }}</code></td>
              <td>
                <code v-if="shownDefault(prop) !== undefined">{{ shownDefault(prop) }}</code>
                <span
                  v-if="__POVESTE_DEV__ && prop.defaultConflict"
                  :title="`The code's default is shown; the @default tag says ${prop.defaultTag}`"
                  data-slot="default-conflict"
                >≠</span>
              </td>
              <td>
                <span
                  v-if="tagText(prop.tags, 'deprecated') !== undefined"
                  data-slot="deprecated"
                >Deprecated<template v-if="tagText(prop.tags, 'deprecated')">: {{ tagText(prop.tags, 'deprecated') }}</template></span>
                {{ prop.description }}
                <template
                  v-for="tag of prop.tags.filter(tag => tag.name === 'see' || tag.name === 'link')"
                  :key="tag.text"
                >
                  <a
                    v-if="tagHref(tag.text ?? '')"
                    :href="tagHref(tag.text ?? '')"
                    target="_blank"
                    rel="noopener"
                    data-slot="see"
                  >{{ tag.text }}</a>
                  <span
                    v-else
                    data-slot="see"
                  >{{ tag.text }}</span>
                </template>
                <pre
                  v-if="tagText(prop.tags, 'example')"
                  data-slot="example"
                ><code>{{ tagText(prop.tags, 'example') }}</code></pre>
              </td>
            </tr>
          </tbody>
        </table>

        <table
          v-if="component.doc.slots.length"
          data-slot="slots"
        >
          <thead>
            <tr>
              <th>Slot</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="slot of component.doc.slots"
              :key="slot.name"
              :data-slot-name="slot.name"
            >
              <td><code>{{ slot.name }}</code></td>
              <td><code v-if="slot.type">{{ slot.type }}</code></td>
              <td>{{ slot.description }}</td>
            </tr>
          </tbody>
        </table>

        <table
          v-if="component.doc.events.length"
          data-slot="events"
        >
          <thead>
            <tr>
              <th>Event</th>
              <th>Payload</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="event of component.doc.events"
              :key="event.name"
              :data-event="event.name"
            >
              <td>
                <code>{{ event.name }}</code>
                <code
                  v-if="modelLabel(component.doc, event.name)"
                  :title="`Bound two ways with ${modelLabel(component.doc, event.name)}, with the ${event.name.slice('update:'.length)} prop`"
                  data-slot="model"
                >{{ modelLabel(component.doc, event.name) }}</code>
              </td>
              <td><code v-if="event.type">{{ event.type }}</code></td>
              <td>{{ event.description }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </details>
  </div>
</template>

<style scoped>
.poveste-component-docs {
  padding: 1rem;
  font-size: .875rem;
  color: var(--color-gray-800);

  /* On the subject, not `.ptw-dark &`: `.ptw-dark` sits above the `@scope` root (#101). */
  &:where(.ptw-dark, .ptw-dark *) {
    color: var(--color-gray-200);
  }
}

details + details {
  margin-top: 1.5rem;
}

summary {
  cursor: pointer;
  margin-bottom: .5rem;
}

h3 {
  display: inline;
  font-weight: 600;
  font-size: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

th {
  text-align: start;
  font-weight: 500;
  color: var(--color-gray-500);
}

th,
td {
  padding: .375rem .5rem;
  border-bottom: 1px solid var(--color-gray-200);
  vertical-align: top;

  &:where(.ptw-dark, .ptw-dark *) {
    border-color: var(--color-gray-750);
  }
}

code {
  font-size: .8125rem;
  background-color: var(--color-gray-100);
  border-radius: .25rem;
  padding: 0 .25rem;

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

.deprecated {
  text-decoration: line-through;
}

[data-slot='required'] {
  color: var(--color-red-500);
  margin-inline-start: .125rem;
}

[data-slot='model'] {
  display: inline-block;
  margin-inline-start: .375rem;
  color: var(--color-primary-600);
  cursor: help;

  &:where(.ptw-dark, .ptw-dark *) {
    color: var(--color-primary-400);
  }
}

[data-slot='deprecated'],
[data-slot='default-conflict'] {
  color: var(--color-amber-600);
  font-weight: 500;

  &:where(.ptw-dark, .ptw-dark *) {
    color: var(--color-amber-400);
  }
}

[data-slot='default-conflict'] {
  margin-inline-start: .25rem;
  cursor: help;
}

[data-slot='see'] {
  display: block;
  margin-top: .25rem;
}

a[data-slot='see'] {
  color: var(--color-primary-500);
  text-decoration: underline;
}

[data-slot='error'] {
  color: var(--color-gray-500);
}
</style>
