<script lang="ts" setup>
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ locale: string, count?: number }>()

const { locale, t } = useI18n({ useScope: 'global' })
watch(() => props.locale, (l) => {
  locale.value = l
}, { immediate: true })
</script>

<template>
  <p>{{ props.count == null ? t('greeting') : t('items', props.count) }}</p>
</template>
