export default {
  viteIgnorePlugins: [
    'fixture-compile',
    { name: 'fixture-setup', hooks: ['configureServer', 'configurePreviewServer'] },
  ],
}
