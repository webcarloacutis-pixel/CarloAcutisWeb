"use client"
import { Sparkles } from "lucide-react"
import { apiUrl } from "@/lib/api-url"
import { useCatalogCollection } from "@/lib/use-catalog-collection"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { CatalogPagination, useCatalogPage } from "./catalog-pagination"

type Miracle = { id: string; title: string; details: string | null; date: string | null; location: string | null; approved: boolean }
export function SaintMiracles({ saintId }: { saintId: string }) {
  const { items, loading, error, retry } = useCatalogCollection<Miracle>(apiUrl(`/saints/${encodeURIComponent(saintId)}/miracles`))
  const page = useCatalogPage(items)
  if (loading) return <p role="status">Cargando relatos de milagros…</p>
  if (error) return <div role="alert"><p>{error}</p><Button onClick={retry}>Reintentar</Button></div>
  if (!items.length) return null
  return <Card className="mb-8">
    <CardHeader><CardTitle className="font-playfair flex items-center gap-2"><Sparkles className="h-5 w-5 text-secondary" />Relatos de milagros</CardTitle></CardHeader>
    <CardContent><div className="space-y-6">
      {page.items.map(miracle => <article key={miracle.id}>
        <h4 className="font-playfair text-lg font-semibold mb-2">{miracle.title}</h4>
        <p className="text-muted-foreground mb-3 whitespace-pre-wrap break-words">{miracle.details}</p>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {miracle.date && <span><strong>Fecha:</strong> {miracle.date}</span>}
          {miracle.location && <span><strong>Lugar:</strong> {miracle.location}</span>}
          {miracle.approved && <Badge variant="outline">Aprobado en el catálogo</Badge>}
        </div>
      </article>)}
    </div><CatalogPagination {...page} label="relatos de milagros" /></CardContent>
  </Card>
}
