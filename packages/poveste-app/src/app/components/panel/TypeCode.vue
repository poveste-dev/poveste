<script lang="ts" setup>
import type { ThemedToken } from 'shiki/core'
import { shallowRef, watchEffect } from 'vue'
import { isDark } from '../../util/dark'
import { getHighlighter } from '../../util/highlighter'

const props = defineProps<{
  type: string
  /** Coloured for a dark ground whatever the chrome's theme: a tooltip is dark in both. */
  dark?: boolean
}>()

// A bare type is not a statement, so it is read as the right-hand side of one and the
// prefix dropped: the grammar then colours `"sm" | "md"` as types, not as strings in a void.
const PREFIX = 'type _ = '

const tokens = shallowRef<ThemedToken[]>()

watchEffect(async () => {
  const type = props.type
  const theme = props.dark || isDark.value ? 'github-dark' : 'github-light-high-contrast'
  try {
    const highlighter = await getHighlighter()
    const lines = highlighter.codeToTokens(PREFIX + type, { lang: 'tsx', theme }).tokens
    tokens.value = afterPrefix(lines.flatMap((line, index) => index ? [{ content: '\n', offset: 0 } as ThemedToken, ...line] : line))
  }
  catch {
    // The plain text stays: a type cell reads without colour.
    tokens.value = undefined
  }
})

function afterPrefix(line: ThemedToken[]): ThemedToken[] {
  let skip = PREFIX.length
  const out: ThemedToken[] = []
  for (const token of line) {
    if (skip >= token.content.length) {
      skip -= token.content.length
      continue
    }
    out.push(skip ? { ...token, content: token.content.slice(skip) } : token)
    skip = 0
  }
  return out
}
</script>

<template>
  <code
    data-slot="type"
  ><template v-if="tokens"><span
    v-for="(token, index) of tokens"
    :key="index"
    :style="{ color: token.color }"
  >{{ token.content }}</span></template><template v-else>{{ type }}</template></code>
</template>
