import type { Awaitable } from '../type-utils.js'

export interface PromptBase<TValue> {
  field: string
  label: string
  required?: boolean
  defaultValue?: TValue | ((answers: Record<string, any>) => TValue)
}

export interface TextPrompt extends PromptBase<string> {
  type: 'text'
}

export type SelectPromptOption = string | { value: string, label: string }

export interface SelectPrompt extends PromptBase<string> {
  type: 'select'
  options: SelectPromptOption[] | ((search: string, answers: Record<string, any>) => Awaitable<SelectPromptOption[]>)
}

// No type parameter: both members fix their value type to `string` via
// `PromptBase<string>`, so the `<TValue = any>` this used to carry never
// reached anything and no caller ever passed one.
export type Prompt = TextPrompt
  | SelectPrompt
