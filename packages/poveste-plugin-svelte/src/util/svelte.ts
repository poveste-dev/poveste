import type { StoryError } from '@poveste/shared'
import type { SvelteStorySetupApi, SvelteStorySetupHandler } from '../helpers.js'
import { getSetupHook, reportStoryError } from '@poveste/shared'
import * as svelte from 'svelte'
import { SVELTE_RETIRED_SETUP_HOOK_NAMES, SVELTE_SETUP_HOOK_NAMES } from '../setup-hooks.js'

type StoryOccupant = Pick<StoryError, 'storyId' | 'variantId'>

type SetupModule = Record<string, unknown>

export interface MountedSvelteComponent {
  app: any
  destroy: () => void
}

export interface LegacyStateApi {
  captureState: () => Record<string, any> | null
  injectState: (state: Record<string, any>) => void
}

function loadSvelteModule(moduleId: string) {
  return import(/* @vite-ignore */ moduleId)
}

function report<T>(mount: () => T, occupant?: StoryOccupant): T {
  try {
    return mount()
  }
  catch (error) {
    reportStoryError(error, occupant)
    throw error
  }
}

export async function mountSvelteComponent(
  component: any,
  options: Record<string, any>,
  mode: 'auto' | 'client' | 'server-compat' = 'auto',
  // Which story this is, so a report is not misattributed to whatever the realm
  // was retargeted to next (#240).
  occupant?: StoryOccupant,
): Promise<MountedSvelteComponent> {
  if (mode !== 'server-compat') {
    if (typeof (svelte as any)?.mount === 'function') {
      // Svelte throws out of `mount` rather than swallowing it, so this only
      // reports and rethrows — the host needs to know a story is broken, and
      // nothing downstream should behave differently for it (#323).
      const app = report(() => (svelte as any).mount(component, options), occupant)
      return {
        app,
        destroy: () => {
          if (typeof (svelte as any).unmount === 'function') {
            ;(svelte as any).unmount(app)
          }
          else {
            app?.$destroy?.()
          }
        },
      }
    }
  }

  try {
    // eslint-disable-next-line new-cap
    const app = report(() => new component(options), occupant)
    return {
      app,
      destroy: () => {
        app?.$destroy?.()
      },
    }
  }
  catch (error) {
    const legacyModuleId = ['svelte', 'legacy'].join('/')
    const legacy = await loadSvelteModule(legacyModuleId).catch(() => null)
    if (typeof legacy?.createClassComponent === 'function') {
      const app = legacy.createClassComponent({
        component,
        ...options,
      })
      return {
        app,
        destroy: () => {
          app?.$destroy?.()
        },
      }
    }

    throw error
  }
}

export function getLegacyStateApi(app: any): LegacyStateApi | null {
  if (typeof app?.$capture_state !== 'function' || typeof app?.$inject_state !== 'function') {
    return null
  }

  return {
    captureState: () => app.$capture_state(),
    injectState: (state) => {
      app.$inject_state(state)
    },
  }
}

export async function callSetupFunctions(
  generatedSetup: SetupModule,
  setup: SetupModule,
  setupApi: SvelteStorySetupApi,
  variantSetupApp?: SvelteStorySetupHandler | null,
) {
  // One hook per module, not every name present. The loop this replaces ran all
  // of them, so a file part-way through the migration — exporting `setupSvelte5`
  // and `setupSvelte` at once — had its setup applied twice, silently. That is
  // the failure the Vue pair has always been shaped to prevent (#157).
  const api = withRemovedApp(setupApi)

  const generatedHook = getSetupHook<SvelteStorySetupHandler>(generatedSetup, SVELTE_SETUP_HOOK_NAMES, SVELTE_RETIRED_SETUP_HOOK_NAMES)
  if (generatedHook) {
    await runSetupHook(generatedHook, api, 'A plugin\'s setup hook')
  }

  const setupHook = getSetupHook<SvelteStorySetupHandler>(setup, SVELTE_SETUP_HOOK_NAMES, SVELTE_RETIRED_SETUP_HOOK_NAMES)
  if (setupHook) {
    const name = SVELTE_SETUP_HOOK_NAMES.find(candidate => setup[candidate] === setupHook)
    await runSetupHook(setupHook, api, `The setup file's \`${name}\` hook`)
  }

  if (typeof variantSetupApp === 'function') {
    await runSetupHook(variantSetupApp, api, 'The variant\'s `setupApp`')
  }
}

// Collection reports a throw under the story file's name, which sends the reader to the wrong file (#1639).
async function runSetupHook(hook: SvelteStorySetupHandler, api: SvelteStorySetupApi, which: string) {
  try {
    await hook(api)
  }
  catch (error) {
    throw new Error(`${which} threw: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
}

const REMOVED_APP = 'there is no `app` any more, because setup hooks run before the story mounts. '
  + 'Pass a value to the story\'s components with `setContext`, and read the story\'s DOM from a component in the story with `onMount`. '
  + 'See https://poveste.dev/guide/svelte/app-setup#what-the-hook-receives'

// A 0.22.1 hook received the mounted app. Destructuring it must keep working, so only using it throws (#1639).
function withRemovedApp(setupApi: SvelteStorySetupApi): SvelteStorySetupApi {
  const fail = (): never => {
    throw new Error(REMOVED_APP)
  }
  const app = new Proxy({}, {
    get: (_target, key) => typeof key === 'symbol' || key === 'then' ? undefined : fail(),
    set: fail,
    has: fail,
    ownKeys: fail,
    deleteProperty: fail,
    defineProperty: fail,
    getOwnPropertyDescriptor: fail,
  })
  return Object.defineProperty({ ...setupApi }, 'app', { value: app, enumerable: false })
}

/**
 * Adds `controlComponent` to a props object **without** spreading it.
 *
 * Svelte 5 passes a bound prop as an accessor pair — `bind:value` becomes a
 * `get value()` / `set value(v)` on the props object. Spreading invokes the
 * getter and writes a plain data property, so the setter is dropped and the
 * child's write-back silently goes nowhere: reads keep working, writes stop.
 * That was the whole of #81.
 *
 * Copying the descriptors keeps the setter intact.
 */
function withControlComponent(props: any, controlComponent: any) {
  const merged = Object.defineProperties({}, Object.getOwnPropertyDescriptors(props ?? {}))
  Object.defineProperty(merged, 'controlComponent', {
    value: controlComponent,
    enumerable: true,
    writable: true,
    configurable: true,
  })
  return merged
}

export function createWrappedComponent(Wrap: any, controlComponent: any) {
  function ProxyWrap(anchorOrOptions: any, props?: any) {
    if (new.target) {
      return new Wrap({
        ...anchorOrOptions,
        props: withControlComponent(anchorOrOptions?.props, controlComponent),
      })
    }

    return Wrap(anchorOrOptions, withControlComponent(props, controlComponent))
  }

  if (Wrap?.element) {
    ProxyWrap.element = Wrap.element
  }

  return ProxyWrap
}
