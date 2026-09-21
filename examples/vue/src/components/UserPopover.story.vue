<script setup lang="ts">
import UserPopover from './UserPopover.vue'
</script>

<template>
  <Story
    id="isolation-popover-theming"
    title="Style Isolation/Popover theming"
    :layout="{
      type: 'grid',
      width: 360,
    }"
  >
    <Variant title="user-themed">
      <UserPopover />
    </Variant>
  </Story>
</template>
