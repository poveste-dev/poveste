<script setup lang="ts">
import { SelectRoot, SelectTrigger } from '../components'
import Helper from './_Helper.vue'
</script>

<template>
  <Story title="Named" :component="[SelectRoot, SelectTrigger]" :layout="{ type: 'single' }">
    <Helper />
  </Story>
</template>
