"use client"
import { Button } from "./ui/button"
import type { SaintPage } from "@/lib/saint-pages"

export function SaintPagePagination({ page, onCursor, label = "santos", disabled = false }: {
  page: Pick<SaintPage, "total" | "offset" | "hasMore" | "hasPrevious" | "nextCursor" | "previousCursor"> & { items: unknown[] }; onCursor: (cursor: string | null) => void; label?: string; disabled?: boolean
}) {
  if (!page.hasMore && !page.hasPrevious) return null
  return <nav aria-label={"Paginación de " + label} className="flex flex-wrap items-center justify-center gap-3 pt-4">
    <Button variant="outline" disabled={disabled || !page.hasPrevious} onClick={() => onCursor(page.previousCursor)}>Anterior</Button>
    <span role="status" className="text-sm">{page.offset + 1}–{page.offset + page.items.length} de {page.total}</span>
    <Button variant="outline" disabled={disabled || !page.hasMore} onClick={() => onCursor(page.nextCursor)}>Siguiente</Button>
  </nav>
}
