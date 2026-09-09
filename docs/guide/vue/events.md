---
title: 'Events in Vue — see what a component emits'
description: 'Log the events a Vue component emits and inspect their payloads in the Events pane.'
---

# Events

Poveste can display a list of events emitted from your story. To register new events, use the `logEvent` function from `poveste/client`.

The first parameter is the name of the event, and the second one is a data object you want to display when clicking on the event.

```vue{3,10,11}
<script lang="ts" setup>
import EventButton from './EventButton.vue'
import { logEvent } from 'poveste/client'
</script>

<template>
  <Story
    title="events/EventButton"
  >
    <EventButton @myEvent="logEvent('My event', $event)" /><br>
    <button @click="logEvent('Click', $event)">
      Click
    </button>
  </Story>
</template>
```
