/*
 * Main-thread cost, from long animation frames rather than long tasks (#872).
 *
 * Sandboxes are same-origin, so their work runs on the host's main thread, and
 * much of it runs in a frame's rendering steps: `requestAnimationFrame` callbacks
 * and the scroll handling a fling triggers. Those are not tasks, so a `longtask`
 * observer never reports them: 150ms planted in a sandbox's rAF read as nothing,
 * which is how #319 read `blocked` as 0 at about 87ms a frame. Long-animation-frame
 * entries do see it, and report it to the top window with each script's
 * `windowAttribution`: `self` for the host, `descendant` for a sandbox.
 */

export const LOAF_INIT = `
  if (window === window.top) {
    window.__loaf = { supported: PerformanceObserver.supportedEntryTypes.includes('long-animation-frame'), frames: [] }
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__loaf.frames.push({
            startTime: entry.startTime,
            duration: entry.duration,
            scripts: entry.scripts.map(script => ({ duration: script.duration, windowAttribution: script.windowAttribution })),
          })
        }
      }).observe({ type: 'long-animation-frame', buffered: true })
    } catch {}
  }
`

/**
 * Script time split by where it ran, and the frames over 50ms, for the frames that
 * started in `[from, to)`. Every field is `null` when the browser has no LoAF, so
 * an unsupported run cannot read as a cheap one.
 */
export function summarizeLoaf(loaf, { from = -Infinity, to = Infinity } = {}) {
  if (!loaf?.supported) {
    return { hostScriptMs: null, sandboxScriptMs: null, longestSandboxScriptMs: null, otherScriptMs: null, longFrames: null, worstFrameMs: null }
  }
  const frames = loaf.frames.filter(frame => frame.startTime >= from && frame.startTime < to)
  let host = 0
  let sandbox = 0
  let other = 0
  let longestSandbox = 0
  for (const frame of frames) {
    for (const script of frame.scripts) {
      if (script.windowAttribution === 'self') {
        host += script.duration
      }
      else if (script.windowAttribution === 'descendant') {
        sandbox += script.duration
        longestSandbox = Math.max(longestSandbox, script.duration)
      }
      else {
        other += script.duration
      }
    }
  }
  const long = frames.filter(frame => frame.duration > 50)
  return {
    hostScriptMs: Math.round(host),
    sandboxScriptMs: Math.round(sandbox),
    longestSandboxScriptMs: Math.round(longestSandbox),
    otherScriptMs: Math.round(other),
    longFrames: long.length,
    worstFrameMs: Math.round(Math.max(0, ...long.map(frame => frame.duration))),
  }
}

export const LOAF_KEYS = ['hostScriptMs', 'sandboxScriptMs', 'longestSandboxScriptMs', 'otherScriptMs', 'longFrames', 'worstFrameMs']
