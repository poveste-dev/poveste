// @vitest-environment jsdom
import type { A11yResult, A11yRunner } from '../app/util/a11y.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive, shallowRef } from 'vue'
import { useA11yCheck } from '../app/util/a11y-check.js'
import { runA11y } from '../app/util/a11y-run.js'
import { a11yRunnerFor, allDisabled, backgroundBehind, disabledRules, isTransparent, provideA11yRunner } from '../app/util/a11y.js'

const RESULT: A11yResult = { engine: '4', violations: [], passes: 1, unknownRules: [] }

/** The sandbox document as Poveste writes it, around a component. */
function sandbox(component: string) {
  document.documentElement.lang = 'en'
  document.title = 'Poveste'
  document.body.innerHTML = `<div id="app"><div class="__poveste-sandbox-hidden"><div></div></div><div class="__poveste-render-story">${component}</div></div>`
}

// jsdom has no canvas to measure contrast with, and says so on every run.
const SANDBOX_RULES = [...allDisabled(disabledRules(undefined, undefined)), 'color-contrast']

// What a real browser reports with the page-level rules on is `e2e/a11y-panel.spec.ts`'s:
// jsdom leaves `landmark-one-main` and `page-has-heading-one` undecided rather than failed.
describe('the sandbox rule set', () => {
  // Accessible on its own: a link, a paragraph and a button, the shape of most components.
  const FINE = '<a href="/docs">Docs</a><p>Some text</p><button>Click me</button>'

  it('reports nothing about a component that is fine', async () => {
    sandbox(FINE)

    const result = await runA11y(SANDBOX_RULES, undefined)

    expect(result.violations.map(violation => violation.id)).toEqual([])
  })

  // #299: the sandbox document has a `lang`, so the rule needs no exemption and keeps one.
  it('leaves html-has-lang on, and it fails a sandbox without a lang', async () => {
    sandbox(FINE)
    document.documentElement.removeAttribute('lang')

    const result = await runA11y(SANDBOX_RULES, undefined)

    expect(SANDBOX_RULES).not.toContain('html-has-lang')
    expect(result.violations.map(violation => violation.id)).toEqual(['html-has-lang'])
  })

  it('reports what a component gets wrong, with its impact, element and help', async () => {
    sandbox('<button class="empty"></button>')

    const [violation] = (await runA11y(SANDBOX_RULES, undefined)).violations

    expect(violation).toMatchObject({ id: 'button-name', impact: 'critical' })
    expect(violation?.helpUrl).toMatch(/\/button-name/)
    expect(violation?.nodes).toEqual([expect.objectContaining({ target: 'button', html: '<button class="empty"></button>' })])
  })

  it('does not check the hidden mount that collects variants', async () => {
    sandbox('<button>Fine</button>')
    document.querySelector('.__poveste-sandbox-hidden')!.innerHTML = '<button></button>'

    expect((await runA11y(SANDBOX_RULES, undefined)).violations).toEqual([])
  })

  it('says which disabled rules axe does not have, and still runs', async () => {
    sandbox('<button></button>')

    const result = await runA11y([...SANDBOX_RULES, 'button-nam'], undefined)

    expect(result.unknownRules).toEqual(['button-nam'])
    expect(result.violations.map(violation => violation.id)).toEqual(['button-name'])
  })

  it('skips the rules a book and a story turn off', async () => {
    sandbox('<button></button>')
    const rules = disabledRules({ disableRules: ['button-name'] }, { disableRules: ['region'] })

    const result = await runA11y(allDisabled(rules), undefined)

    expect(rules.book).toEqual(['button-name'])
    expect(rules.story).toEqual(['region'])
    expect(result.violations).toEqual([])
  })

  it('paints the colour behind the frame only for the run', async () => {
    sandbox('<p>Text</p>')
    const seen: string[] = []
    const observer = new MutationObserver(() => seen.push(document.documentElement.style.backgroundColor))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })

    await runA11y(SANDBOX_RULES, 'rgb(55, 65, 81)')
    await nextTick()
    observer.disconnect()

    expect(seen).toEqual(['rgb(55, 65, 81)', ''])
  })

  it('leaves a background the book paints itself', async () => {
    sandbox('<p>Text</p>')
    document.body.style.backgroundColor = 'rgb(255, 0, 0)'

    await runA11y(SANDBOX_RULES, 'rgb(55, 65, 81)')

    expect(document.documentElement.style.backgroundColor).toBe('')
    document.body.style.backgroundColor = ''
  })
})

describe('allDisabled', () => {
  it('names each rule once', () => {
    expect(allDisabled({ sandbox: ['region'], book: ['region', 'a'], story: ['a', 'b'] })).toEqual(['region', 'a', 'b'])
  })
})

describe('backgroundBehind', () => {
  it('is the nearest ancestor that paints', () => {
    document.body.innerHTML = '<div style="background-color: rgb(1, 2, 3)"><div style="background-color: rgba(0, 0, 0, 0)"><iframe></iframe></div></div>'

    expect(backgroundBehind(document.querySelector('iframe'))).toBe('rgb(1, 2, 3)')
  })

  it('is undefined when nothing paints', () => {
    document.body.innerHTML = '<div><iframe></iframe></div>'

    expect(backgroundBehind(document.querySelector('iframe'))).toBeUndefined()
  })

  it('reads every spelling of nothing painted', () => {
    expect(['transparent', 'rgba(0, 0, 0, 0)', 'oklch(0.5 0.1 200 / 0)'].every(isTransparent)).toBe(true)
    expect(['rgb(0, 0, 0)', 'rgba(0, 0, 0, 0.5)', 'oklch(0.37 0.03 259)'].some(isTransparent)).toBe(false)
  })
})

describe('the runner registry', () => {
  it('forgets a runner only when its own provider leaves', () => {
    const first: A11yRunner = async () => RESULT
    const second: A11yRunner = async () => RESULT
    const leaveFirst = provideA11yRunner('s', 'v', first)
    const leaveSecond = provideA11yRunner('s', 'v', second)

    leaveFirst()
    expect(a11yRunnerFor('s', 'v')).toBe(second)

    leaveSecond()
    expect(a11yRunnerFor('s', 'v')).toBeUndefined()
  })
})

describe('useA11yCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function setup(automatic: boolean) {
    const runner = vi.fn<A11yRunner>(async () => RESULT)
    const current = shallowRef<A11yRunner | undefined>(runner)
    const state = reactive({ text: 'a' })
    const scope = effectScope()
    const check = scope.run(() => useA11yCheck({
      runner: () => current.value,
      disabledRules: () => ['region'],
      automatic: () => automatic,
      changes: () => state,
    }))!
    return { runner, current, state, scope, check }
  }

  it('runs as soon as a variant has a runner, with the rules off', async () => {
    const { runner, check, scope } = setup(true)
    await vi.runAllTimersAsync()

    expect(runner).toHaveBeenCalledWith(['region'])
    expect(check.status.value).toBe('done')
    expect(check.result.value).toBe(RESULT)
    scope.stop()
  })

  it('runs once after a burst of changes, not once per change', async () => {
    const { runner, state, scope } = setup(true)
    await vi.runAllTimersAsync()
    runner.mockClear()

    state.text = 'ab'
    await nextTick()
    state.text = 'abc'
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)
    expect(runner).not.toHaveBeenCalled()

    await vi.runAllTimersAsync()
    expect(runner).toHaveBeenCalledTimes(1)
    scope.stop()
  })

  it('runs only on request where it is not automatic', async () => {
    const { runner, state, check, scope } = setup(false)
    state.text = 'b'
    await vi.runAllTimersAsync()

    expect(runner).not.toHaveBeenCalled()
    expect(check.status.value).toBe('idle')

    await check.run()
    expect(runner).toHaveBeenCalledTimes(1)
    expect(check.status.value).toBe('done')
    scope.stop()
  })

  it('says so when no sandbox renders the variant', async () => {
    const { current, check, scope } = setup(true)
    current.value = undefined
    await nextTick()

    expect(check.status.value).toBe('unavailable')
    scope.stop()
  })

  it('drops an answer that arrives after the variant changed', async () => {
    const { current, check, scope } = setup(false)
    let answer!: (result: A11yResult) => void
    current.value = () => new Promise(resolve => answer = resolve)
    await nextTick()

    const running = check.run()
    current.value = undefined
    await nextTick()
    answer(RESULT)
    await running

    expect(check.result.value).toBeUndefined()
    expect(check.status.value).toBe('unavailable')
    scope.stop()
  })

  it('shows the error a run fails with', async () => {
    const { current, check, scope } = setup(false)
    current.value = async () => {
      throw new Error('The sandbox did not answer.')
    }
    await nextTick()

    await check.run()

    expect(check.status.value).toBe('error')
    expect(check.error.value).toBe('The sandbox did not answer.')
    scope.stop()
  })

  it('stops a pending run when the panel closes', async () => {
    const { runner, state, scope } = setup(true)
    await vi.runAllTimersAsync()
    runner.mockClear()

    state.text = 'later'
    await nextTick()
    scope.stop()
    await vi.runAllTimersAsync()

    expect(runner).not.toHaveBeenCalled()
  })
})
