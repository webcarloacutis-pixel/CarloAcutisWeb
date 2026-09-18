"use client"
import { useState } from "react"
import { Sparkles } from "lucide-react"
import { apiUrl } from "@/lib/api-url"
import { miraclePageUrl } from "@/lib/miracle-pages"
import { useMiraclePage } from "@/lib/use-miracle-page"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { SaintPagePagination } from "./saint-page-pagination"

export function SaintMiracles({ saintId }: { saintId: string }) {
  const [cursor, setCursor] = useState<string | null>(null)
  const { page, previousPage, loading, error, retry } = useMiraclePage(apiUrl(miraclePageUrl(`/saints/${encodeURIComponent(saintId)}/miracles`, { query: "" }, cursor)))
  const display = page || (loading ? previousPage : null)
  if (error) return <div role="alert"><p>{error}</p><Button onClick={retry}>Reintentar</Button>{cursor && <Button onClick={() => setCursor(null)}>Volver a la primera página</Button>}</div>
  if (!display) return <p role="status">Cargando relatos de milagros…</p>
  if (!display.total) return null
  return <Card className="mb-8" aria-busy={loading}>
    <CardHeader><CardTitle className="font-playfair flex items-center gap-2"><Sparkles className="h-5 w-5 text-secondary" />Relatos de milagros</CardTitle></CardHeader>
    <CardContent><div className="space-y-6">
      {display.items.map(miracle => <article key={miracle.id}>
        <h4 className="font-playfair text-lg font-semibold mb-2">{miracle.title}</h4>
        <p className="text-muted-foreground mb-3 whitespace-pre-wrap break-words">{miracle.details}</p>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {miracle.date && <span><strong>Fecha:</strong> {miracle.date}</span>}
          {miracle.location && <span><strong>Lugar:</strong> {miracle.location}</span>}
          {miracle.approved && <Badge variant="outline">Aprobado en el catálogo</Badge>}
        </div>
      </article>)}
    </div><SaintPagePagination page={display} onCursor={setCursor} label="relatos de milagros" disabled={loading} /></CardContent>
  </Card>
}
