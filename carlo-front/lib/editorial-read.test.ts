import { describe, expect, it } from 'vitest'
import { editorialForDisplay } from './editorial-read'

describe('existing partial editorial JSON', () => {
  it('does not mutate legacy JSON or invent dates/sources', () => {
    const legacy = { kind: 'person', notes: 'Existing note' }
    expect(editorialForDisplay(legacy)).toMatchObject({ kind: 'person', notes: 'Existing note', birthDate: { text: null, status: 'unknown' }, sources: [], image: null })
    expect(legacy).toEqual({ kind: 'person', notes: 'Existing note' })
  })
  it.each([null, undefined, [], 'bad', 10])('ignores invalid editorial object %s', value => expect(editorialForDisplay(value)).toBeNull())
  it('preserves non-person unknown dates without invented biography', () => {
    expect(editorialForDisplay({ kind: 'archangel' })).toMatchObject({ birthDate: { text: null, status: 'not-applicable' }, birthplaceStatus: 'not-applicable' })
  })
  it('omits unsafe links and malformed source/image metadata', () => {
    expect(editorialForDisplay({ sources: [{url:'javascript:alert(1)'}, {url:'https://user:secret@example.invalid'}, {url:'https://example.org/source', claims: ['Evidence', 2]}], image: { sourceUrl: 'https://example.org' } })).toMatchObject({sources: [{url:'https://example.org/source',claims:['Evidence']}],image:null})
  })
})
