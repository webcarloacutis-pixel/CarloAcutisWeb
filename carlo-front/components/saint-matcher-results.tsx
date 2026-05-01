"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, RefreshCw, ArrowRight } from "lucide-react"

export type DiscoverSaintMatch = {
  id?: string
  slug: string
  name: string
  score?: number
}

export type DiscoverSaintResult = {
  summary: string
  matches: DiscoverSaintMatch[]
  termsUsed?: string[]
}

export function SaintMatcherResults({
  result,
  onReset,
}: {
  result: DiscoverSaintResult
  onReset: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full">
            <Heart className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <h2 className="font-playfair text-3xl font-bold text-gray-900 mb-2">Tus Santos Afines</h2>
        <p className="text-gray-600 mb-4">Hemos encontrado santos que comparten características contigo</p>

        <Button onClick={onReset} variant="outline" className="bg-transparent">
          <RefreshCw className="mr-2 h-4 w-4" />
          Hacer nuevo análisis
        </Button>
      </div>

      {result?.summary && (
        <Card className="border-amber-200 bg-gradient-to-br from-white to-amber-50">
          <CardContent className="p-4 text-gray-800">{result.summary}</CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {(result?.matches || []).map((m, idx) => (
          <Card key={m.id || m.slug || String(idx)} className="border-2 border-amber-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="font-playfair text-xl text-gray-900">{m.name}</CardTitle>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Ranking #{idx + 1}
                    </Badge>
                    {typeof m.score === "number" && (
                      <Badge variant="outline" className="text-xs">
                        score: {m.score}
                      </Badge>
                    )}
                  </div>
                </div>

                <Link
                  href={`/santos/${m.slug}`}
                  className="inline-flex items-center text-sm font-medium text-amber-700 hover:text-amber-800"
                >
                  Ver santo <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
