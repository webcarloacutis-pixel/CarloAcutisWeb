"use client"
import { SaintsPagedCatalog } from "./saints-paged-catalog"
import { SaintsExplorer } from "./saints-explorer"
import { Button } from "./ui/button"
import { apiUrl } from "@/lib/api-url"
import type { PublicSaint } from "@/lib/content-filters"
import { useCatalogCollection } from "@/lib/use-catalog-collection"

export function SaintsCatalog({ mapOnly = false }: { mapOnly?: boolean }) {
  return mapOnly ? <SaintsMapCatalog /> : <SaintsPagedCatalog />
}

function SaintsMapCatalog() {
  const { items, loading, error, retry } = useCatalogCollection<PublicSaint>(apiUrl("/saints?view=map"))
  if (loading) return <p role="status">Cargando catálogo de santos…</p>
  if (error) return <div role="alert"><p>{error}</p><Button onClick={retry}>Reintentar</Button></div>
  return <SaintsExplorer saints={items} mapOnly />
}
