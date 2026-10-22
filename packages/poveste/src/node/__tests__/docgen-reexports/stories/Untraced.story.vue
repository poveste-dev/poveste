<script setup lang="ts">
import { Missing } from '../components'
import { useThing } from './use-thing'

useThing()
</script>

<template>
  <Story title="Untraced">
    <Missing />
  </Story>
</template>
