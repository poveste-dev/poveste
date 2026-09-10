import { router } from './router.js'

export function setupPluginApi() {
  // Captured rather than re-read: the narrowing from this guard does not reach
  // into the callbacks below, and `hot?.send` there would leave `sendEvent`'s
  // promise waiting for a reply to a message that was never sent.
  const hot = import.meta.hot
  if (!hot) return

  const listeners: Record<string, Set<(result: any) => unknown>> = {}

  hot.on('poveste:dev-event-result', ({ event, result }) => {
    const set = listeners[event]
    if (set) {
      for (const listener of set) {
        listener(result)
      }
    }
  })

  function addDevEventListener(event: string, listener: (result: any) => unknown) {
    let set = listeners[event]
    if (!set) {
      set = new Set()
      listeners[event] = set
    }
    set.add(listener)
    return () => {
      set.delete(listener)
    }
  }

  // function removeDevEventListener (event: string, listener: (result: any) => unknown) {
  //   const set = listeners[event]
  //   if (set) {
  //     set.delete(listener)
  //   }
  // }

  window.__HST_PLUGIN_API__ = {
    sendEvent: (event: string, payload?: any) => {
      return new Promise((resolve) => {
        hot.send(`poveste:dev-event`, {
          event,
          payload,
        })
        if (event.startsWith('on')) {
          resolve(undefined)
        }
        else {
          const off = addDevEventListener(event, (result: any) => {
            off()
            resolve(result)
          })
        }
      })
    },

    openStory: (storyId: string) => {
      router.push({ name: 'story', params: { storyId } })
    },
  }
}
