"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function useCatalogPage<T>(items: T[], size = 12) {
  const [state, setState] = useState({ items, index: 0 })
  const last = Math.max(0, Math.ceil(items.length / size) - 1)
  const index = state.items === items ? Math.min(state.index, last) : 0
  return {
    items: items.slice(index * size, (index + 1) * size), index, size, total: items.length,
    onPage: (next: number) => setState({ items, index: Math.max(0, Math.min(next, last)) }),
  }
}

export function CatalogPagination({ index, size, total, onPage, label }: {
  index: number; size: number; total: number; onPage: (index: number) => void; label: string
}) {
  if (total <= size) return null
  return <nav aria-label={"Paginación de " + label} className="flex flex-wrap items-center justify-center gap-3 pt-4">
    <Button variant="outline" disabled={index === 0} onClick={() => onPage(index - 1)}>Anterior</Button>
    <span role="status" className="text-sm">{index * size + 1}–{Math.min((index + 1) * size, total)} de {total}</span>
    <Button variant="outline" disabled={(index + 1) * size >= total} onClick={() => onPage(index + 1)}>Siguiente</Button>
  </nav>
}
