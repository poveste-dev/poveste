import type { HstControlOption } from '@poveste/controls'
import type { Story, StoryProps, Variant, VariantProps } from '@poveste/shared'
import type { Component, Snippet } from 'svelte'

export interface SvelteStorySetupApi {
  app: any
  story?: Story
  variant?: Variant
}

export type SvelteStorySetupHandler = (api: SvelteStorySetupApi) => Promise<void> | void

export function defineSetupSvelte(handler: SvelteStorySetupHandler): SvelteStorySetupHandler {
  return handler
}

export const defineSetupSvelte3 = defineSetupSvelte
export const defineSetupSvelte4 = defineSetupSvelte
export const defineSetupSvelte5 = defineSetupSvelte

export type StoryState = Record<string, any>

/**
 * Props plus Svelte 5 children.
 *
 * `StoryProps` and `VariantProps` live in `@poveste/shared` and are shared with
 * the Vue plugin, so a Svelte-only `Snippet` cannot be added there — it is
 * intersected in here instead.
 *
 * This is what the move off `SvelteComponentTyped` needed. The class form carried
 * Svelte 4 slot typing, so nested content type-checked implicitly; `Component<P>`
 * has no slots, and Svelte 5 passes children as a prop (#99).
 */
type WithChildren<P> = P & {
  children?: Snippet<[{ state: StoryState }]>
  controls?: Snippet<[{ state: StoryState }]>
}

/**
 * Story state is owned by poveste, not by the story component.
 *
 * The story is mounted once per slot, so a component-local variable exists twice
 * and cannot be shared. `initState` seeds `variant.state`, which both mounts read
 * and which the sandbox bridge carries across the iframe boundary (#81).
 */
type WithState<P> = Omit<P, 'source'> & {
  initState?: () => StoryState
  /** A literal, or a function of the variant state so the source panel can track the controls. */
  source?: string | ((state: StoryState) => string)
}

export interface Hst {
  // Main built-ins
  Story: Component<WithState<WithChildren<StoryProps>>>
  Variant: Component<WithState<WithChildren<VariantProps>>>
  // Controls
  // Deliberately permissive. This was previously a bare `SvelteComponentTyped`,
  // i.e. props `any`; it wraps a Vue control whose default slot renders the label,
  // and the prop set `Wrap` forwards is not pinned down. Narrowing it is its own
  // change rather than a silent break.
  Button: Component<WithChildren<Record<string, any>>>
  ButtonGroup: Component<{
    value?: string
    options: (string | HstControlOption)[]
    title?: string
  }>
  Checkbox: Component<{
    value?: boolean
    title: string
  }>
  CheckboxList: Component<{
    value: string[]
    options: (string | HstControlOption)[]
    title?: string
  }>
  Text: Component<{
    value?: string
    title: string
  }>
  Number: Component<{
    value?: number
    title: string
    step?: number
  }>
  Slider: Component<{
    value?: number
    title: string
    min: number
    max: number
    step?: number
  }>
  Textarea: Component<{
    value?: string
    title: string
  }>
  Select: Component<{
    value?: string
    title: string
    options: Record<string, any> | string[] | HstControlOption[]
  }>
  Radio: Component<{
    value?: string
    options: HstControlOption[]
    title?: string
  }>
  Json: Component<{
    value: unknown
    title: string
  }>
  Shades: Component<{
    shades: Record<string, any>
    getName?: (key: string, color: string) => string
    search?: string
  }>
  TokenList: Component<{
    tokens: Record<string, string | number | any[] | Record<string, any>>
    getName?: (key: string, value: string | number | any[] | Record<string, any>) => string
  }>
  TokenGrid: Component<{
    tokens: Record<string, string | number | any[] | Record<string, any>>
    getName?: (key: string, value: string | number | any[] | Record<string, any>) => string
    colSize?: number
  }>
  CopyIcon: Component<{
    content: string
  }>
  ColorSelect: Component<{
    value?: string
    title: string
  }>
}
