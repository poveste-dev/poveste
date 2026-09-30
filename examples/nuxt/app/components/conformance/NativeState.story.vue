<script lang="ts" setup>
import { ref } from 'vue'

// The binding lives here rather than in `initState`, because that is the half
// the native path leaves uncovered. `implicitState` is built from a story's
// `<script setup>` exposures, and `mountStateSync` is what keeps it and the
// app's `variant.state` in step — including for a variant the reader is not
// looking at. A story whose state arrives through the slot prop is already
// `variant.state` on both sides, so it cannot tell whether that sync ran.
//
// `iframe: false` renders into the host document, where there is no
// `postMessage` bridge to take over afterwards. Every other state story reaches
// its subject through `frameLocator`, which is why removing the host sync left
// 241 specs green (#968).
const label = ref('alpha')
const bumps = ref(0)

defineExpose({ label, bumps })
</script>

<template>
  <Story
    id="conformance-native-state"
    title="Conformance/Native state"
    :layout="{ type: 'single', iframe: false }"
  >
    <Variant
      id="alpha"
      title="Alpha"
    >
      <p class="conformance-native-label">
        {{ label }}
      </p>
      <p class="conformance-native-bumps">
        {{ bumps }}
      </p>
      <button
        class="conformance-native-bump"
        @click="bumps++"
      >
        Bump
      </button>
      <button
        class="conformance-native-rename"
        @click="label = 'from story'"
      >
        Rename
      </button>
    </Variant>

    <Variant
      id="beta"
      title="Beta"
    >
      <p class="conformance-native-label">
        {{ label }}
      </p>
      <p class="conformance-native-bumps">
        {{ bumps }}
      </p>
    </Variant>
  </Story>
</template>
