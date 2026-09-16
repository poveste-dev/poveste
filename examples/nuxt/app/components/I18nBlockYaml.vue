<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

// Same as I18nBlock, but the `<i18n>` block is YAML rather than JSON — proving
// the block compiler @nuxtjs/i18n installs handles `lang="yaml"` too (#65).
const props = defineProps<{ locale: string }>()

const { t } = useI18n()
</script>

<template>
  <p>{{ t('blockMessage', {}, { locale: props.locale }) }}</p>
</template>

<i18n lang="yaml">
en:
  blockMessage: From a YAML block
fr:
  blockMessage: Depuis un bloc YAML
</i18n>
