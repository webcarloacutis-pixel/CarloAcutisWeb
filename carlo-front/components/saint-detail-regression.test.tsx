import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { SaintDetail, type Saint } from './saint-detail'

vi.mock('./catalog-image', () => ({ CatalogImage: ({ alt }: { alt: string }) => <span>{alt}</span> }))
vi.mock('./translated-text', () => ({ TranslatedText: ({ text }: { text: string }) => <span>{text}</span> }))
vi.mock('./saint-miracles', () => ({ SaintMiracles: () => null }))

describe('real legacy editorial shape: Santa Felicidad / San Carlo Acutis', () => {
  for (const name of ['Santa Felicidad', 'San Carlo Acutis']) it(`${name} keeps its biography with partial metadata and no image`, () => {
    // Same JSON shape observed via Express, Next proxy and read-only SQL on 2026-09-18.
    const saint = { id: 'legacy-fixture', slug: 'legacy-fixture', name, biography: 'Existing biography', image: null,
      patronOf: [], symbols: [], prayers: [], editorial: { kind: 'person', notes: 'Existing editorial note' } } as unknown as Saint
    const html = renderToStaticMarkup(<SaintDetail saint={saint} />)
    expect(html).toContain(name)
    expect(html).toContain('Existing biography')
    expect(html).toContain('Existing editorial note')
    expect(html).toContain('Desconocido')
  })
  it('a saint with no editorial data remains readable', () => {
    expect(renderToStaticMarkup(<SaintDetail saint={{ id: 'null-fixture', slug: 'null-fixture', name: 'Null metadata', editorial: null, biography: null }} />)).toContain('Null metadata')
  })
})
