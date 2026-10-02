import type { ClientSupportPlugin } from '@poveste/shared'
import type { Story, Variant } from '../types'
import { unindent } from '@poveste/shared'
import { clientSupportPlugins } from 'virtual:$poveste-support-plugins-client'

export type GenerateSourceCode = ClientSupportPlugin['generateSourceCode']

/** What the variant declares, or what its framework generates from it; `undefined` when neither has anything. */
export async function getDynamicSourceCode(variant: Variant, generate: GenerateSourceCode | undefined): Promise<string | undefined> {
  if (variant.source) {
    return variant.source
  }
  const sourceSlot = variant.slots?.().source
  if (sourceSlot) {
    const source = sourceSlot()[0].children
    return source ? unindent(source) : undefined
  }
  return (await generate?.(variant)) || undefined
}

export async function getStaticSourceCode(story: Story): Promise<string | undefined> {
  const sourceLoader = story.file?.source
  return sourceLoader ? (await sourceLoader()).default : undefined
}

export async function loadGenerateSourceCode(story: Story): Promise<GenerateSourceCode | undefined> {
  const supportPluginId = story.file?.supportPluginId
  const clientPlugin = supportPluginId ? clientSupportPlugins[supportPluginId] : undefined
  return clientPlugin ? (await clientPlugin()).generateSourceCode : undefined
}

export async function getSourceCode(story: Story, variant: Variant): Promise<string | undefined> {
  const generate: GenerateSourceCode = async v => (await loadGenerateSourceCode(story))?.(v)
  return (await getDynamicSourceCode(variant, generate)) || getStaticSourceCode(story)
}
