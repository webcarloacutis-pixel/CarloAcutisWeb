"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiUrl } from "@/lib/api-url"
import { fetchPublicCollection } from "@/lib/public-collection"

type MiracleApi = { id: string; approved: boolean }

export function AdminMiraclesStatsCard() {
  const [total, setTotal] = useState(0)
  const [approved, setApproved] = useState(0)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    fetchPublicCollection<MiracleApi>(apiUrl('/miracles/all'), {cache:'no-store', credentials:'include', signal:controller.signal})
      .then(data => {
        if (controller.signal.aborted) return
        setTotal(data.length)
        setApproved(data.filter(miracle => miracle.approved).length)
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
