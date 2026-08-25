<script lang="ts" setup>
import { watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ locale: string, count?: number }>()

const { locale, t } = useI18n({ useScope: 'global' })
watchEffect(() => {
  locale.value = props.locale
})
</script>

<template>
  <p>{{ props.count == null ? t('greeting') : t('items', props.count) }}</p>
</template>
