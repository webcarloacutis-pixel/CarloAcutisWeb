// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { translations } from '@/lib/translations'
import { AdminSaintsModal, type Saint } from './admin-saints-modal'

const state = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: state.refresh }) }))
vi.mock('@/contexts/language-context', () => ({ useLanguage: () => ({ language: 'es', t: (key: string) => translations.es[key] ?? key }) }))

const fetcher = vi.fn(async (_url: RequestInfo | URL, _options?: RequestInit) => Response.json({ id: 'synthetic-legacy' }))
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute('open') } })
})
beforeEach(() => { vi.stubGlobal('fetch', fetcher) })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })
afterAll(() => {
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal)
  else delete HTMLDialogElement.prototype.showModal
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose)
  else delete HTMLDialogElement.prototype.close
})

function legacy(overrides: Record<string, unknown> = {}): Saint {
  return {
    id: 'synthetic-legacy', slug: 'synthetic-legacy', name: 'Synthetic legacy',
    title: '  Original synthetic title  ', country: null, biography: '  Original synthetic biography.\n',
    birthSources: null, patronOf: ['  Original synthetic patronage  '], symbols: ['Original\nsynthetic symbol'],
    editorial: { kind: 'person', notes: 'Raw partial metadata.', legacyKey: { preserved: true } } as unknown as NonNullable<Saint['editorial']>,
    createdAt: '2026-10-10T00:00:00.000Z', updatedAt: '2026-10-10T00:00:00.000Z', ...overrides,
  }
}

function edit(key: string, value: string) {
  fireEvent.change(document.getElementById(key)!, { target: { value } })
}
function save() { fireEvent.click(screen.getByRole('button', { name: translations.es['supplemental.saveChanges'] })) }
function payload() { return JSON.parse(String(fetcher.mock.calls[0][1]?.body)) }

it('PATCHes only the changed biography and leaves raw nulls, arrays, whitespace and partial editorial untouched', async () => {
  const onClose = vi.fn()
  render(<AdminSaintsModal open onClose={onClose} saint={legacy()} />)
  edit('biography', 'Updated synthetic biography.')
  save()
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  expect(fetcher).toHaveBeenCalledOnce()
  expect(fetcher.mock.calls[0][0]).toBe('/api/saints/synthetic-legacy')
  expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'PATCH', credentials: 'include' })
  expect(payload()).toEqual({ biography: 'Updated synthetic biography.' })
  expect(state.refresh).toHaveBeenCalledOnce()
})

it.each([
  ['', []],
  [' https://example.invalid/source-a \nhttps://example.invalid/source-b\n', ['https://example.invalid/source-a', 'https://example.invalid/source-b']],
] as const)('keeps an explicitly changed source array writable, including an explicit clear', async (value, expected) => {
  const onClose = vi.fn()
  render(<AdminSaintsModal open onClose={onClose} saint={legacy({ birthSources: ['https://example.invalid/original'] })} />)
  edit('birthSources', value)
  save()
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  expect(payload()).toEqual({ birthSources: [...expected] })
})

it.each(['unchanged', 'changed-back'])('closes a %s edit without an empty PATCH or normalization', (mode) => {
  const onClose = vi.fn()
  render(<AdminSaintsModal open onClose={onClose} saint={legacy()} />)
  if (mode === 'changed-back') { edit('title', 'Temporary synthetic title'); edit('title', '  Original synthetic title  ') }
  save()
  expect(fetcher).not.toHaveBeenCalled()
  expect(onClose).toHaveBeenCalledOnce()
})

it('sends just an edited coordinate so the backend can validate it against the stored pair and provenance', async () => {
  const onClose = vi.fn()
  render(<AdminSaintsModal open onClose={onClose} saint={legacy({ birthLat: 40, birthLng: 10, birthCountryCode: 'IT', birthContinent: 'europe', birthPrecision: 'city', birthSources: ['https://example.invalid/provenance'] })} />)
  edit('birthLat', '41.5')
  save()
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  expect(payload()).toEqual({ birthLat: 41.5 })
})

it('retains required-name validation before a PATCH', () => {
  render(<AdminSaintsModal open onClose={vi.fn()} saint={legacy()} />)
  edit('name', '   ')
  save()
  expect(screen.getByRole('alert').textContent).toBe(translations.es['supplemental.nameRequired'])
  expect(fetcher).not.toHaveBeenCalled()
})

it('retains the generated slug when the slug is explicitly cleared', async () => {
  const onClose = vi.fn()
  render(<AdminSaintsModal open onClose={onClose} saint={legacy()} />)
  edit('slug', '')
  save()
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  expect(payload()).toEqual({ slug: 'synthetic-legacy' })
})

it('retains the full creation payload and name-based slug generation', async () => {
  const onClose = vi.fn()
  render(<AdminSaintsModal open onClose={onClose} />)
  edit('name', 'New Synthetic')
  fireEvent.click(screen.getByRole('button', { name: translations.es['supplemental.create'] }))
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  expect(fetcher.mock.calls[0][0]).toBe('/api/saints')
  expect(fetcher.mock.calls[0][1]?.method).toBe('POST')
  expect(payload()).toEqual({
    slug: 'new-synthetic', name: 'New Synthetic', title: null, feastDay: null, country: null, continent: null,
    imageUrl: null, birthYear: null, deathYear: null, canonizationYear: null, birthPlace: null, birthCountryCode: null,
    birthContinent: null, birthLat: null, birthLng: null, birthPrecision: null, lat: null, lng: null, biography: null,
    patronOf: [], symbols: [], birthSources: [],
  })
})

it('does not PATCH normalized legacy editorial when an editorial edit is reverted to its initial display', () => {
  const onClose = vi.fn()
  render(<AdminSaintsModal open onClose={onClose} saint={legacy()} />)
  edit('editorial-notes', 'Temporary synthetic editorial note.')
  edit('editorial-notes', 'Raw partial metadata.')
  save()
  expect(fetcher).not.toHaveBeenCalled()
  expect(onClose).toHaveBeenCalledOnce()
})

it('sends complete explicit editorial input when its final displayed note actually changes', async () => {
  const onClose = vi.fn()
  render(<AdminSaintsModal open onClose={onClose} saint={legacy()} />)
  edit('editorial-notes', 'Explicit synthetic editorial update.')
  save()
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  expect(payload()).toEqual({ editorial: {
    kind: 'person', ecclesialStatus: 'Sin documentar', birthDate: { text: null, status: 'unknown' },
    deathDate: { text: null, status: 'unknown' }, birthplaceStatus: 'unknown',
    notes: 'Explicit synthetic editorial update.', sources: [], image: null,
  } })
})
