<script setup lang="ts">
import { ref } from 'vue'
import { Card, SelectRoot, SelectTrigger } from '../components'

const open = ref(false)
</script>

<template>
  <Story title="Barrel">
    <Card>
      <SelectRoot :open="open">
        <SelectTrigger label="Pick" />
      </SelectRoot>
    </Card>
  </Story>
</template>
