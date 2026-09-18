"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiUrl } from "@/lib/api-url"
import { fetchCollectionTotal } from "@/lib/public-collection"

export function AdminPrayersStatsCard() {
  const [counts, setCounts] = useState<{ total: number; approved: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all(["/prayers/all", "/prayers/approved"].map(path =>
      fetchCollectionTotal(apiUrl(path), { cache: "no-store", credentials: "include", signal: controller.signal })
    ))
      .then(([total, approved]) => {
        if (!controller.signal.aborted) setCounts({ total, approved })
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar el total.")
      })
    return () => controller.abort()
  }, [])
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Oraciones</CardTitle></CardHeader>
      <CardContent>
        {error ? <p role="alert" className="text-sm text-destructive">Error: {error}</p> : counts ? <>
          <div className="text-3xl font-bold">{counts.total}</div>
          <p className="text-sm text-muted-foreground">{counts.approved} aprobadas</p>
        </> : <p role="status" className="text-sm text-muted-foreground">Cargando total…</p>}
      </CardContent>
    </Card>
  )
}
