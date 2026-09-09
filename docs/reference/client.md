---
title: 'Client API — helpers you call from inside a story'
description: 'Log events to the Events pane, set story state and reach the controls from inside a story file, through the poveste/client module.'
---

# Client API Reference

You can access various APIs meant to be used inside stories from the `poveste/client` module.

## `logEvent`

Logs an event in the `Events` sidepane.

```js
import { logEvent } from 'poveste/client'

logEvent('click', { some: 'data' })
```

## `isCollecting`

Returns `true` if the story is executing through the NodeJS server.

```js
import { isCollecting } from 'poveste/client'

if (!isCollecting()) {
  // do something only in the browser
}
```

## `isDark`

Returns `true` if dark mode is enabled.

```js
import { isDark } from 'poveste/client'

if (isDark()) {
  // do something only in dark mode
}
```

## `toggleDark`

`toggleDark(value?: boolean): boolean`

Toggles dark mode. If `value` is provided, it will be used instead of toggling. Returns the new value.

```js
import { toggleDark } from 'poveste/client'

toggleDark(true)
```
