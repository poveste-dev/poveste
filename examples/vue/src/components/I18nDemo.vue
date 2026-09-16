<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

const props = defineProps<{ locale: string, count?: number }>()

// Resolve in the requested locale per call rather than writing the shared global
// `locale`, so sibling grid cells stay independent.
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <p>{{ props.count == null ? t('greeting', {}, { locale: props.locale }) : t('items', props.count, { locale: props.locale }) }}</p>
</template>
