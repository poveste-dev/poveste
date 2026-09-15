import type { PagePayload } from './index.js'
import { describe, expect, it } from 'vitest'
import { navigationOptions } from './index.js'

/*
 * Every snapshot Percy received was the empty sandbox shell, because puppeteer
 * navigates on `load` by default and that fires before the story mounts (#352).
 * A blank baseline never fails, so the suite reported no visual changes for as
 * long as it ran.
 */
const PAYLOAD: PagePayload = {
  file: 'src/components/Demo.story.vue',
  story: { title: 'Demo' },
  variant: { id: 'demo-0', title: 'default' },
}

describe('navigationOptions', () => {
  it('waits for the network to settle when nothing was configured', () => {
    expect(navigationOptions({}, PAYLOAD)).toEqual({ waitUntil: 'networkidle0' })
  })

  it('waits for it when no options were given at all', () => {
    expect(navigationOptions(undefined, PAYLOAD).waitUntil).toBe('networkidle0')
  })

  it('keeps an option the caller set beside it', () => {
    expect(navigationOptions({ referer: 'https://example.invalid' }, PAYLOAD)).toEqual({
      waitUntil: 'networkidle0',
      referer: 'https://example.invalid',
    })
  })

  it('lets the caller choose a different wait', () => {
    expect(navigationOptions({ waitUntil: 'domcontentloaded' }, PAYLOAD).waitUntil).toBe('domcontentloaded')
  })

  // The callback form is why this is not left to `defu`: it merges against the
  // function, never against what the function returns, so a caller passing one
  // navigated on puppeteer's `load` default and snapshotted the shell.
  it('waits for it in the callback form too', () => {
    expect(navigationOptions(() => ({ referer: 'https://example.invalid' }), PAYLOAD).waitUntil)
      .toBe('networkidle0')
  })

  it('still lets a callback choose its own wait', () => {
    expect(navigationOptions(() => ({ waitUntil: 'load' }), PAYLOAD).waitUntil).toBe('load')
  })

  it('gives the callback the payload it decides from', () => {
    const seen: PagePayload[] = []

    navigationOptions((payload) => {
      seen.push(payload)
      return {}
    }, PAYLOAD)

    expect(seen).toEqual([PAYLOAD])
  })
})
