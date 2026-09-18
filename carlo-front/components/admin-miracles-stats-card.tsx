"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiUrl } from "@/lib/api-url"
import { fetchCollectionTotal } from "@/lib/public-collection"


export function AdminMiraclesStatsCard() {
  const [total, setTotal] = useState(0)
  const [approved, setApproved] = useState(0)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all(['/miracles/all', '/miracles'].map(path => fetchCollectionTotal(apiUrl(path), {cache:'no-store', credentials:'include', signal:controller.signal})))
      .then(([total, approved]) => {
        if (controller.signal.aborted) return
        setTotal(total)
        setApproved(approved)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Error')
      })
    return () => controller.abort()
  }, [])
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Milagros</CardTitle></CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{total}</div>
        <p className="text-sm text-muted-foreground">{error ? `Error: ${error}` : `${approved} verificados`}</p>
      </CardContent>
    </Card>
  )
}
