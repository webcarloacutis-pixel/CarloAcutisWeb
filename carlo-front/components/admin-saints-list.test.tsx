// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AdminSaintsList } from './admin-saints-list'

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('./catalog-image', () => ({ CatalogImage: () => null }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); refresh.mockClear() })

it('manages the last of 3000 saints with bounded cards and deletes through the authenticated API proxy', async () => {
  const saints = Array.from({ length: 3000 }, (_, index) => ({ id: `fixture-${index}`, slug: `fixture-${index}`, name: `Synthetic ${index}`, createdAt: '2026-09-18', updatedAt: '2026-09-18' }))
  const fetcher = vi.fn(async () => Response.json({ ok: true }))
  vi.stubGlobal('fetch', fetcher)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const changed = vi.fn()
  window.addEventListener('catalog:saints-changed', changed)
  try {
    render(<AdminSaintsList saints={saints} onAddNew={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.getAllByRole('button', { name: /^Editar$/ })).toHaveLength(12)
    fireEvent.change(screen.getByPlaceholderText('Buscar santos...'), { target: { value: '2999' } })
    expect(screen.getAllByRole('button', { name: /^Editar$/ })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Synthetic 2999' }))
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith('/api/saints/fixture-2999', { method: 'DELETE', credentials: 'include' }))
    await waitFor(() => expect(changed).toHaveBeenCalledTimes(1))
    expect(refresh).toHaveBeenCalledTimes(1)
  } finally { window.removeEventListener('catalog:saints-changed', changed) }
})
