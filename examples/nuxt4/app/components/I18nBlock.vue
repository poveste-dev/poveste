<script lang="ts" setup>
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

// A component-local `<i18n>` block: its own messages, compiled by the block
// compiler @nuxtjs/i18n installs. `useI18n()` with no scope picks up the block.
const props = defineProps<{ locale: string }>()

const { locale, t } = useI18n()
watch(() => props.locale, (l) => {
  locale.value = l
}, { immediate: true })
</script>

<template>
  <p>{{ t('blockMessage') }}</p>
</template>

<i18n lang="json">
{
  "en": { "blockMessage": "From an in-component block" },
  "fr": { "blockMessage": "Depuis un bloc dans le composant" }
}
</i18n>
