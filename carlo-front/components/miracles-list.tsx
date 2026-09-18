"use client";
import { SaintPagePagination } from "./saint-page-pagination"
import { miraclePageUrl } from "@/lib/miracle-pages"
import { useMiraclePage } from "@/lib/use-miracle-page"
import { useSaintNames } from "@/lib/use-saint-names"
import { T } from "@/components/t";
import { apiUrl } from "@/lib/api-url";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, MapPin, Calendar, Users, Search, Filter } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export function MiraclesList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSaint, setSelectedSaint] = useState("Todos los santos")
  const [selectedType, setSelectedType] = useState("Todos los tipos")
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  const [cursor, setCursor] = useState<string | null>(null)
  const names = useSaintNames()
  const result = useMiraclePage(apiUrl(miraclePageUrl("/miracles", {
    query: searchTerm, saintId: selectedSaint === "Todos los santos" ? undefined : selectedSaint,
    type: selectedType === "Todos los tipos" ? undefined : selectedType, approved: verifiedOnly ? true : undefined,
  }, cursor)))
  const { loading } = result
  const error = result.error || names.error
  const page = result.page || (loading ? result.previousPage : null)
  const saints = names.items
  const filteredMiracles = (page?.items || []).map(miracle => ({
    ...miracle, description: miracle.details || "", verified: miracle.approved,
    witnesses: (miracle.witnesses || "").split(",").map(item => item.trim()).filter(Boolean),
  }))
  function filterChanged(change: () => void) { change(); setCursor(null) }

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
                onChange={(e) => filterChanged(() => setSearchTerm(e.target.value))}
                className="pl-10"
              />
            </div>

            <select aria-label="Filtrar milagros por santo" value={selectedSaint} onChange={event => filterChanged(() => setSelectedSaint(event.target.value))} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="Todos los santos">Todos los santos</option>
              {saints.map(saint => <option key={saint.id} value={saint.id}>{saint.name}</option>)}
            </select>

            <Select value={selectedType} onValueChange={value => filterChanged(() => setSelectedType(value))}>
              <SelectTrigger aria-label="Filtrar milagros por tipo">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos los tipos">Todos los tipos</SelectItem>
                {(page?.metadata.facets.types || []).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={verifiedOnly ? "default" : "outline"}
              aria-pressed={verifiedOnly}
              onClick={() => filterChanged(() => setVerifiedOnly(!verifiedOnly))}
              className="justify-start"
              disabled={loading}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Solo aprobados en el catálogo
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setCursor(null)
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
            <Badge variant="secondary">{page?.total ?? "—"} milagros encontrados</Badge>
            <Badge variant="outline">{page?.metadata.approvedTotal ?? "—"} aprobados en el catálogo</Badge>
          </div>

          {loading ? <p className="mt-3 text-sm text-muted-foreground">Cargando milagros...</p> : null}
          {error ? <div role="alert" className="mt-3 space-y-2"><p className="text-sm text-destructive whitespace-pre-wrap">{error}</p><Button onClick={() => { result.retry(); if (names.error) names.retry() }}>Reintentar</Button>{cursor && <Button onClick={() => setCursor(null)}>Volver a la primera página</Button>}</div> : null}
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
      {page && <SaintPagePagination page={page} onCursor={setCursor} label="milagros" disabled={loading} />}
    </div>
  )
}
