"use client";
import { T } from "@/components/t";
import { apiUrl } from "@/lib/api-url";
import { fetchPublicCollection } from "@/lib/public-collection";
import { normalizeText } from "@/lib/content-filters";


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


  useEffect(() => {
    let mounted = true
    const controller = new AbortController()

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [saintsData, miraclesData] = await Promise.all([
          fetchPublicCollection<SaintApi>(apiUrl("/saints"), { signal: controller.signal, cache: "no-store" }),
          fetchPublicCollection<MiracleApi>(apiUrl("/miracles"), { signal: controller.signal, cache: "no-store" }),
        ])
        if (!mounted) return
        setSaints(saintsData)
        const byId = new Map(saintsData.map((saint) => [saint.id, saint]))
        setAllMiracles(miraclesData.map((miracle) => ({
          id: miracle.id, saintId: miracle.saintId, title: miracle.title || "Milagro",
          description: miracle.details || "", type: miracle.type || "", date: miracle.date,
          location: miracle.location, witnesses: (miracle.witnesses || "").split(",").map((item) => item.trim()).filter(Boolean),
          verified: miracle.approved, createdAt: miracle.createdAt,
          saintName: byId.get(miracle.saintId)?.name || "Santo sin información",
          saintSlug: byId.get(miracle.saintId)?.slug || "",
        })))
      } catch {
        if (!mounted) return
        setError("No se pudieron cargar los milagros. Vuelve a intentarlo.")
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
      controller.abort()
    }
  }, [])

  const filteredMiracles = useMemo(() => {
    const q = normalizeText(searchTerm)

    const filtered = allMiracles.filter((miracle) => {
      const matchesSearch =
        normalizeText(miracle.title).includes(q) ||
        normalizeText(miracle.description).includes(q) ||
        normalizeText(miracle.saintName).includes(q)

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
                placeholder="Buscar milagros..." aria-label="Buscar milagros" maxLength={200}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedSaint} onValueChange={setSelectedSaint}>
              <SelectTrigger aria-label="Filtrar milagros por santo">
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
              <SelectTrigger aria-label="Filtrar milagros por tipo">
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
              aria-pressed={verifiedOnly}
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className="justify-start"
              disabled={loading}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Solo aprobados en el catálogo
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
              <T k="saints.filters.clear" />
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Badge variant="secondary">{filteredMiracles.length} milagros encontrados</Badge>
            <Badge variant="outline">{filteredMiracles.filter((m) => m.verified).length} aprobados en el catálogo</Badge>
          </div>

          {loading ? <p className="mt-3 text-sm text-muted-foreground">Cargando milagros...</p> : null}
          {error ? <p className="mt-3 text-sm text-destructive whitespace-pre-wrap">{error}</p> : null}
        </CardContent>
      </Card>

      {!loading && !error && filteredMiracles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-playfair text-xl font-semibold mb-2">No se encontraron milagros</h3>
            <p className="text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
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
                    <Link prefetch={false} href={miracle.saintSlug ? "/santos/" + encodeURIComponent(miracle.saintSlug) : "/santos"} className="text-primary hover:underline font-medium">
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
                  {miracle.verified && <Badge variant="secondary">Aprobado en el catálogo</Badge>}
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
