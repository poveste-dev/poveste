import { defineStory } from '@poveste/plugin-react'

// jsdom has no `ResizeObserver`; a browser does.
function Measured() {
  const observer = new ResizeObserver(() => {})
  observer.disconnect()
  return <p>measured</p>
}

export default defineStory({
  title: 'Measures',
  variants: [{ title: 'observed', render: () => <Measured /> }],
})
