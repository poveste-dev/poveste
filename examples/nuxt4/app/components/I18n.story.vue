<script lang="ts" setup>
import I18nBlock from './I18nBlock.vue'
import I18nDemo from './I18nDemo.vue'

// @nuxtjs/i18n's client plugin can't boot in the story sandbox, so vue-i18n is
// installed in `poveste.setup.ts` instead (#65). `useI18n` resolves against it.
const LOCALES = { en: 'English', fr: 'Français' }

function initState() {
  return { locale: 'en', count: 2 }
}
</script>

<template>
  <Story title="Nuxt/i18n">
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

    <Variant
      title="in-component block"
      :init-state="initState"
    >
      <template #default="{ state }">
        <I18nBlock :locale="state.locale" />
      </template>

      <template #controls="{ state }">
        <HstSelect
          v-model="state.locale"
          title="Locale"
          :options="LOCALES"
        />
      </template>
    </Variant>
  </Story>
</template>
