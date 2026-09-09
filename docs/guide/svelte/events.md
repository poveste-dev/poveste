---
title: 'Events in Svelte — see what a component emits'
description: 'Log the events a Svelte component emits and inspect their payloads in the Events pane.'
---

# Events

Poveste can display a list of events emitted from your story. To register new events, use the `logEvent` function from `poveste/client`.

The first parameter is the name of the event, and the second one is a data object you want to display when clicking on the event.

```svelte{3,11-12}
<script>
  import EventButton from './EventButton.svelte'
  import { logEvent } from 'poveste/client'

  export let Hst
</script>

<Hst.Story
  title="events/EventButton"
>
  <EventButton on:myEvent={arg => logEvent('My event', arg)} /><br>
  <button on:click={event => logEvent('Click', event)}>
    Click
  </button>
</Hst.Story>
```
