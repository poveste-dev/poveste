// What `poveste build` extracted, in a chunk of its own: loaded when a reader first
// opens a story's docs, so a book whose docs nobody opens never downloads it.
export { componentDocs } from 'virtual:$poveste-component-docs'
