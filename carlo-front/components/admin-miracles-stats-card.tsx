"use client"
import { useEffect, useState } from "react"
import { useLanguage } from "@/contexts/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiUrl } from "@/lib/api-url"
import { fetchCollectionTotal } from "@/lib/public-collection"
import { formatTranslation } from "@/lib/format-translation"
import { catalogErrorKey } from "@/lib/public-request"
export function AdminMiraclesStatsCard() {
  const { t } = useLanguage()
  const [counts, setCounts] = useState<{ total: number; approved: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all(["/miracles/all","/miracles"].map(path => fetchCollectionTotal(apiUrl(path), { cache: "no-store", credentials: "include", signal: controller.signal })))
      .then(([total, approved]) => { if (!controller.signal.aborted) setCounts({ total, approved }) })
      .catch(error => { if (!controller.signal.aborted) setError(catalogErrorKey(error)) })
    return () => controller.abort()
  }, [])
  return <Card>
    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("nav.miracles")}</CardTitle></CardHeader>
    <CardContent>
      {error ? <p role="alert" className="text-sm text-destructive">{t(error)}</p> : counts ? <>
        <div className="text-3xl font-bold">{counts.total}</div>
        <p className="text-sm text-muted-foreground">{formatTranslation(t("catalog.approvedCount"), { count: counts.approved })}</p>
      </> : <p role="status" className="text-sm text-muted-foreground">{t("common.loading")}</p>}
    </CardContent>
  </Card>
}
