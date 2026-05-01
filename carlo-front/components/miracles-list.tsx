"use client";
import { T } from "@/components/t";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, MapPin, Calendar, Users, Search, Filter } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type SaintApi = { id: string; slug: string; name: string }

type MiracleApi = {
  id: string
  saintId: string
  title: string
  details: string | null
  type: string | null
  date: string | null
  location: string | null
  witnesses: string | null
  approved: boolean
  createdAt: string
}

type MiracleUi = {
  id: string
  saintId: string
  title: string
  description: string
  type: string
  date: string | null
  location: string | null
  witnesses: string[]
  verified: boolean
  createdAt: string
  saintName: string
  saintSlug: string
}

export function MiraclesList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSaint, setSelectedSaint] = useState("Todos los santos")
  const [selectedType, setSelectedType] = useState("Todos los tipos")
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [saints, setSaints] = useState<SaintApi[]>([])
  const [allMiracles, setAllMiracles] = useState<MiracleUi[]>([])

  const baseUrl = ''

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const saintsRes = await fetch(`${baseUrl}/saints`, { cache: "no-store" })
        if (!saintsRes.ok) throw new Error(`Error /saints (${saintsRes.status})`)
        const saintsData = (await saintsRes.json()) as SaintApi[]
        if (!mounted) return
        setSaints(saintsData)

        const chunks = await Promise.all(
          saintsData.map(async (s) => {
            const res = await fetch(`${baseUrl}/saints/${encodeURIComponent(s.id)}/miracles`, { cache: "no-store" })
            if (!res.ok) return []
            const api = (await res.json()) as MiracleApi[]
            const arr = Array.isArray(api) ? api : []

            return arr.map((m) => {
              const witnesses = (m.witnesses || "")
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean)

              return {
                id: m.id,
                saintId: m.saintId,
                title: m.title || "Milagro",
                description: m.details || "",
                type: (m.type || "").toString(),
                date: m.date ?? null,
                location: m.location ?? null,
                witnesses,
                verified: !!m.approved,
                createdAt: (m as any).createdAt || new Date().toISOString(),
                saintName: s.name,
                saintSlug: s.slug,
              } satisfies MiracleUi
            })
          })
        )

        if (!mounted) return
        setAllMiracles(chunks.flat())
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message ? String(e.message) : "Error cargando milagros")
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [baseUrl])

  const filteredMiracles = useMemo(() => {
    const q = searchTerm.toLowerCase()

    const filtered = allMiracles.filter((miracle) => {
      const matchesSearch =
        (miracle.title || "").toLowerCase().includes(q) ||
        (miracle.description || "").toLowerCase().includes(q) ||
        (miracle.saintName || "").toLowerCase().includes(q)

      const matchesSaint = selectedSaint === "Todos los santos" || miracle.saintName === selectedSaint
      const matchesVerified = !verifiedOnly || miracle.verified
      const matchesType = selectedType === "Todos los tipos" || (miracle.type || "") === selectedType

      return matchesSearch && matchesSaint && matchesVerified && matchesType
    })

    // Orden: mÃ¡s recientes primero (createdAt desc)
    filtered.sort((a, b) => {
      // 1) Verificados primero
      if (a.verified !== b.verified) return a.verified ? -1 : 1

      // 2) MÃ¡s recientes primero
      const ta = Date.parse(a.createdAt || "")
      const tb = Date.parse(b.createdAt || "")
      return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta)
    })

    return filtered
  }, [allMiracles, searchTerm, selectedSaint, selectedType, verifiedOnly])


  return (
    <div className="space-y-6">
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filtrar Milagros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar milagros..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedSaint} onValueChange={setSelectedSaint}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los santos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos los santos">Todos los santos</SelectItem>
                {saints.map((saint) => (
                  <SelectItem key={saint.id} value={saint.name}>
                    {saint.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos los tipos">Todos los tipos</SelectItem>
                {Array.from(new Set(allMiracles.map((m) => (m.type || "").trim()).filter(Boolean))).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={verifiedOnly ? "default" : "outline"}
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className="justify-start"
              disabled={loading}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Solo Verificados
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setSelectedSaint("Todos los santos")
                setVerifiedOnly(false)
                setSelectedType("Todos los tipos")
              }}
              disabled={loading}
            >
              <T k="saints.clearFilters" />
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Badge variant="secondary">{filteredMiracles.length} milagros encontrados</Badge>
            <Badge variant="outline">{filteredMiracles.filter((m) => m.verified).length} verificados</Badge>
          </div>

          {loading ? <p className="mt-3 text-sm text-muted-foreground">Cargando milagros...</p> : null}
          {error ? <p className="mt-3 text-sm text-destructive whitespace-pre-wrap">{error}</p> : null}
        </CardContent>
      </Card>

      {!loading && filteredMiracles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-playfair text-xl font-semibold mb-2">No se encontraron milagros</h3>
            <p className="text-muted-foreground">Intenta ajustar los filtros de bÃºsqueda</p>
          </CardContent>
        </Card>
      ) : (
        filteredMiracles.map((miracle) => (
          <Card key={`${miracle.saintName}-${miracle.id}`} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="font-playfair text-xl mb-2 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-secondary" />
                    {miracle.title}
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Atribuido a{" "}
                    <Link href={`/santos/${miracle.saintSlug}`} className="text-primary hover:underline font-medium">
                      {miracle.saintName}
                    </Link>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {miracle.type && miracle.type.trim() ? (
                    <Badge variant="outline" className="text-xs">
                      {miracle.type}
                    </Badge>
                  ) : null}
                  {miracle.verified && <Badge variant="secondary">Verificado por la Iglesia</Badge>}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <p className="text-muted-foreground mb-4 leading-relaxed text-pretty">{miracle.description}</p>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                {miracle.date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{miracle.date}</span>
                  </div>
                )}
                {miracle.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{miracle.location}</span>
                  </div>
                )}
                {miracle.witnesses && miracle.witnesses.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{miracle.witnesses.length} testigos</span>
                  </div>
                )}
              </div>

              {miracle.witnesses && miracle.witnesses.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Testigos:</p>
                  <div className="flex flex-wrap gap-1">
                    {miracle.witnesses.map((witness, witnessIndex) => (
                      <Badge key={witnessIndex} variant="outline" className="text-xs">
                        {witness}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

