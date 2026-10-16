// Every framework's collect module imports the setup file this way.
import 'virtual:$poveste-setup'

export async function run({ file, storyData }) {
  const { default: story } = await import(/* @vite-ignore */ file.moduleId)
  storyData.push({ ...story, layout: { type: 'single', iframe: true }, variants: [{ id: 'default', title: 'default' }] })
}
