"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type PrayerApi = { id: string; approved: boolean }

export function AdminPrayersStatsCard() {
  const [total, setTotal] = useState(0)
  const [approved, setApproved] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setError(null)
        const baseUrl = ('').trim()
        const res = await fetch(`${baseUrl}/prayers`, { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as PrayerApi[]
        setTotal(data.length)
        setApproved(data.filter((p) => !!p.approved).length)
      } catch (e: any) {
        setError(e?.message ? String(e.message) : "Error")
      }
    })()
  }, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Oraciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{total}</div>
        <p className="text-sm text-muted-foreground">
          {error ? `Error: ${error}` : `${approved} aprobadas`}
        </p>
      </CardContent>
    </Card>
  )
}

