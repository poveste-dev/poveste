<script lang="ts" setup>
import I18nDemo from './I18nDemo.vue'

// Plain Vue + vue-i18n: no Nuxt seam. Installed in `poveste.setup.ts`; here the
// control drives the locale and `useI18n` resolves against it.
const LOCALES = { en: 'English', fr: 'Français' }

function initState() {
  return { locale: 'en', count: 2 }
}
</script>

<template>
  <Story title="i18n">
    <Variant
      title="greeting"
      :init-state="initState"
    >
      <template #default="{ state }">
        <I18nDemo :locale="state.locale" />
      </template>

      <template #controls="{ state }">
        <HstSelect
          v-model="state.locale"
          title="Locale"
          :options="LOCALES"
        />
      </template>
    </Variant>

    <Variant
      title="pluralization"
      :init-state="initState"
    >
      <template #default="{ state }">
        <I18nDemo
          :locale="state.locale"
          :count="state.count"
        />
      </template>

      <template #controls="{ state }">
        <HstSelect
          v-model="state.locale"
          title="Locale"
          :options="LOCALES"
        />
        <HstNumber
          v-model="state.count"
          title="Count"
        />
      </template>
    </Variant>
  </Story>
</template>
