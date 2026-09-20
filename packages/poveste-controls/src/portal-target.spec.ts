import { portalTarget } from './portal-target.ts'

function documentWith(html: string): Document {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
}

describe('where a popper mounts', () => {
  it('is the chrome root, in a document that has one', () => {
    const doc = documentWith('<div class="poveste-app-root"><span id="control" /></div>')

    expect(portalTarget(doc)).toBe(doc.querySelector('.poveste-app-root'))
  })

  it('is body, in a sandbox document that has none', () => {
    const doc = documentWith('<span id="control" />')

    expect(portalTarget(doc)).toBe(doc.body)
  })
})
