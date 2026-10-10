import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { SaintDetail, type Saint } from './saint-detail'
import { translations } from '@/lib/translations'

vi.mock('./catalog-image', () => ({ CatalogImage: ({ alt }: { alt: string }) => <span>{alt}</span> }))
vi.mock('./translated-text', () => ({ TranslatedText: ({ text }: { text: string }) => <span>{text}</span> }))
vi.mock('./saint-miracles', () => ({ SaintMiracles: () => null }))
vi.mock('@/contexts/language-context', () => ({ useLanguage: () => ({ language: 'es', t: (key: string) => translations.es[key] || key }) }))

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

it.each(['Versión redimensionada en WebP','Procedencia','Lugar de nacimiento'])('preserves the original image and birthplace metadata label: %s',label=>{
  const saint={id:'image-fixture',slug:'image-fixture',name:'Documented fixture',birthPlace:'Recorded birthplace',birthCountryCode:'IT',editorial:{kind:'person',image:{kind:'painting',sourceUrl:'https://fixture.invalid/source',creator:'Recorded creator',license:'CC BY 4.0',licenseUrl:'https://fixture.invalid/license',attribution:'Recorded attribution',alt:'Recorded portrait'}}} as unknown as Saint
  const html=renderToStaticMarkup(<SaintDetail saint={saint}/>)
  expect(html).toContain(label)
  expect(html).toContain('Recorded attribution')
  expect(html).toContain('CC BY 4.0')
  expect(html).toContain('href="https://fixture.invalid/source"')
  expect(html).toContain('href="https://fixture.invalid/license"')
  expect(html).toContain('Recorded birthplace')
})
