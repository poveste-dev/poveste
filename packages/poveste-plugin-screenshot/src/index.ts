import type { FileOptions } from 'capture-website'
import type { Plugin } from 'poveste'
import { defu } from 'defu'
import fs from 'fs-extra'
import path from 'pathe'

interface ScreenshotPresets {
  /**
   * Screenshot width.
   */
  width?: number
  /**
   * Screenshot height.
   */
  height?: number
}

export interface ScreenshotPluginOptions {
  /**
   * Folder were screenshots will be saved.
   */
  saveFolder?: string
  /**
   * Ignored stories.
   */
  ignored?: (payload: { file: string, story: { title: string }, variant: { id: string, title: string } }) => boolean
  /**
   * Presets for each screenshot.
   */
  presets?: ScreenshotPresets[]
  /**
   * Args for puppeteer
   */
  launchOptionsArgs?: string[]
}

const defaultOptions: ScreenshotPluginOptions = {
  saveFolder: '.poveste/screenshots',
  presets: [],
}

/**
 * The file one capture is written to.
 *
 * A variant with no explicit `id` is given `${story.id}-${n}`, so naming the
 * file `${story.id}-${variant.id}` repeated the story id in full. The story id
 * still has to be there for the named case: `default` and `one` are only unique
 * within their own story.
 */
export function screenshotFileName(storyId: string, variantId: string, width: number, height: number): string {
  const prefix = `${storyId}-`
  const variant = variantId.startsWith(prefix) ? variantId.slice(prefix.length) : variantId
  return `${storyId}-${variant}-${width}x${height}.png`
}

export function HstScreenshot(options: ScreenshotPluginOptions = {}): Plugin {
  const finalOptions: ScreenshotPluginOptions = defu(options, defaultOptions)
  if (!finalOptions.presets.length) {
    finalOptions.presets.push({
      width: 1280,
      height: 800,
    })
  }
  return {
    name: '@poveste/plugin-screenshot',

    onBuild: async (api) => {
      const { default: captureWebsite } = await import('capture-website')
      await fs.ensureDir(finalOptions.saveFolder)

      api.onPreviewStory(async ({ file, story, variant, url }) => {
        if (finalOptions.ignored?.({
          file,
          story: {
            title: story.title,
          },
          variant: {
            id: variant.id,
            title: variant.title,
          },
        })) {
          return
        }
        console.log('Rendering screenshot for', file, 'title:', story.title, 'variant:', variant.id, 'title:', variant.title)
        for (const preset of finalOptions.presets) {
          const launchOptions = finalOptions.launchOptionsArgs
            ? {
                args: finalOptions.launchOptionsArgs,
              }
            : {}
          const captureWebsiteFileOptions: FileOptions = {
            overwrite: true,
            width: preset.width,
            height: preset.height,
            fullPage: true,
            launchOptions,
          }
          await captureWebsite.file(url, path.join(finalOptions.saveFolder, screenshotFileName(story.id, variant.id, preset.width, preset.height)), captureWebsiteFileOptions)
        }
      })
    },
  }
}
