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
import { useLanguage } from '@/contexts/language-context'

export function SaintMiracles({ saintId }: { saintId: string }) {
  const { t } = useLanguage()
  const [cursor, setCursor] = useState<string | null>(null)
  const { page, previousPage, loading, error, retry } = useMiraclePage(apiUrl(miraclePageUrl(`/saints/${encodeURIComponent(saintId)}/miracles`, { query: "" }, cursor)))
  const display = page || (loading ? previousPage : null)
  if (error) return <div role="alert"><p>{t(error)}</p><Button onClick={retry}>{t('content.retry')}</Button>{cursor && <Button onClick={() => setCursor(null)}>{t('catalog.firstPage')}</Button>}</div>
  if (!display) return <p role="status">{t('catalog.miraclesLoading')}</p>
  if (!display.total) return null
  return <Card className="mb-8" aria-busy={loading}>
    <CardHeader><CardTitle className="font-playfair flex items-center gap-2"><Sparkles className="h-5 w-5 text-secondary" />{t('nav.miracles')}</CardTitle></CardHeader>
    <CardContent><div className="space-y-6">
      {display.items.map(miracle => <article key={miracle.id}>
        <h4 className="font-playfair text-lg font-semibold mb-2">{miracle.title}</h4>
        <p className="text-muted-foreground mb-3 whitespace-pre-wrap break-words">{miracle.details}</p>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {miracle.date && <span><strong>{t('miracles.date')}:</strong> {miracle.date}</span>}
          {miracle.location && <span><strong>{t('miracles.location')}:</strong> {miracle.location}</span>}
          {miracle.approved && <Badge variant="outline">{t('catalog.approved')}</Badge>}
        </div>
      </article>)}
    </div><SaintPagePagination page={display} onCursor={setCursor} label="relatos de milagros" disabled={loading} /></CardContent>
  </Card>
}
