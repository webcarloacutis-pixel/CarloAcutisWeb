"use client"
import { AdminDashboard } from "./admin-dashboard"
import { Button } from "./ui/button"
import { apiUrl } from "@/lib/api-url"
import { useCatalogCollection } from "@/lib/use-catalog-collection"

type AdminSaint = { id: string; slug: string; name: string; createdAt: string; updatedAt: string }
export function AdminCatalog() {
  const { items, loading, error, retry } = useCatalogCollection<AdminSaint>(apiUrl("/saints?view=listing"))
  if (loading) return <p role="status">Cargando catálogo de administración…</p>
  if (error) return <div role="alert"><p>{error}</p><Button onClick={retry}>Reintentar</Button></div>
  return <AdminDashboard saints={items} />
}
