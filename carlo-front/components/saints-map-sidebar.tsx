"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Calendar, Filter } from "lucide-react"

type ApiSaint = {
  id: string
  slug: string
  name: string
  country: string | null
  continent: string | null
  lat: number | null
  lng: number | null
  feastDay?: string | null
  imageUrl?: string | null
}

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function canonContinent(c: string | null) {
  const v = norm(c || "")
  if (!v) return { key: "desconocido", label: "Desconocido" }
  if (v.includes("europa")) return { key: "europa", label: "Europa" }
  if (v.includes("asia")) return { key: "asia", label: "Asia" }
  if (v.includes("america")) return { key: "america", label: "AmÃ©rica" }
  if (v.includes("africa")) return { key: "africa", label: "Ãfrica" }
  if (v.includes("oceania")) return { key: "oceania", label: "OceanÃ­a" }
  return { key: v, label: c || "Desconocido" }
}

export function SaintsMapSidebar() {
  const [selectedContinent, setSelectedContinent] = useState<string>("all")
  const [saints, setSaints] = useState<ApiSaint[]>([])
  const [error, setError] = useState<string | null>(null)

  const baseUrl = ''

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const res = await fetch(`${baseUrl}/saints`, { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP_${res.status}`)
        const data = (await res.json()) as ApiSaint[]
        if (!cancelled) setSaints(Array.isArray(data) ? data : [])
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Error cargando santos")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [baseUrl])

  const filteredSaints = useMemo(() => {
    if (selectedContinent === "all") return saints
    return saints.filter((s) => canonContinent(s.continent).key === selectedContinent)
  }, [saints, selectedContinent])

  const continentStats = useMemo(() => {
    const acc: Record<string, { label: string; count: number }> = {}
    for (const s of saints) {
      const c = canonContinent(s.continent)
      if (!acc[c.key]) acc[c.key] = { label: c.label, count: 0 }
      acc[c.key].count++
    }
    // orden bonito: Europa/Asia/AmÃ©rica/Ãfrica/OceanÃ­a/otros
    const order = ["europa", "asia", "america", "africa", "oceania", "desconocido"]
    const entries = Object.entries(acc)
    entries.sort((a, b) => {
      const ia = order.indexOf(a[0])
      const ib = order.indexOf(b[0])
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
      return a[1].label.localeCompare(b[1].label)
    })
    return entries
  }, [saints])

  return (
    <div className="space-y-6">
      {/* Filtro */}
      <Card>
        <CardHeader>
          <CardTitle className="font-playfair flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Filtrar por RegiÃ³n
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedContinent} onValueChange={setSelectedContinent}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar continente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los continentes</SelectItem>
              <SelectItem value="europa">Europa</SelectItem>
              <SelectItem value="asia">Asia</SelectItem>
              <SelectItem value="america">AmÃ©rica</SelectItem>
              <SelectItem value="africa">Ãfrica</SelectItem>
              <SelectItem value="oceania">OceanÃ­a</SelectItem>
              <SelectItem value="desconocido">Desconocido</SelectItem>
            </SelectContent>
          </Select>

          {error && (
            <p className="mt-3 text-xs text-destructive">
              Error: <span className="font-mono">{error}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* EstadÃ­sticas */}
      <Card>
        <CardHeader>
          <CardTitle className="font-playfair text-lg">EstadÃ­sticas Globales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {continentStats.map(([key, v]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{v.label}</span>
                <Badge variant="outline">{v.count} santos</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="font-playfair text-lg">
            Santos {selectedContinent !== "all" && `de ${selectedContinent}`}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{filteredSaints.length} santos encontrados</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredSaints.map((saint) => {
              const country = saint.country?.trim() || "Desconocido"
              const feastDay = saint.feastDay?.trim() || "â€”"
              const img = saint.imageUrl || "/placeholder.svg"
              const hasCoords = typeof saint.lat === "number" && typeof saint.lng === "number"

              return (
                <div key={saint.id} className="flex gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                    <img
                      src={img}
                      alt={saint.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).src = "/placeholder.svg"
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{saint.name}</h4>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">
                        {country}
                        {!hasCoords && <span className="ml-2 text-[10px] opacity-70">(sin ubicaciÃ³n)</span>}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Calendar className="h-3 w-3" />
                      <span>{feastDay}</span>
                    </div>

                    <Button asChild size="sm" variant="outline" className="w-full text-xs bg-transparent">
                      <Link href={`/santos/${saint.slug}`}>Ver Detalles</Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="font-playfair text-lg">Â¿SabÃ­as que...?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Los santos provienen de todos los continentes, mostrando la universalidad de la santidad en la Iglesia
              CatÃ³lica.
            </p>
            <p>Cada marcador en el mapa representa el lugar de nacimiento o ministerio principal del santo.</p>
            <p>Puedes hacer clic en cualquier paÃ­s para ver informaciÃ³n detallada de sus santos.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

