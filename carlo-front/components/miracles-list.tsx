"use client";
import { SaintPagePagination } from "./saint-page-pagination"
import { miraclePageUrl } from "@/lib/miracle-pages"
import { useMiraclePage } from "@/lib/use-miracle-page"
import { useSaintNames } from "@/lib/use-saint-names"
import { LocalCatalogRecord } from "./local-catalog-record"
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
import { useLanguage } from '@/contexts/language-context'

export function MiraclesList() {
  const { t } = useLanguage()
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
  const loading = result.loading || names.loading
  const error = result.error || names.error
  const page = result.page || (loading ? result.previousPage : null)
  const saints = names.items
  const filteredMiracles = page?.items || []
  function filterChanged(change: () => void) { change(); setCursor(null) }

  return (
    <div className="space-y-6" aria-busy={loading}>
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            {t('catalog.filterMiracles')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t('catalog.searchMiracles') + '…'} aria-label={t('catalog.searchMiracles')} maxLength={200}
                value={searchTerm}
                onChange={(e) => filterChanged(() => setSearchTerm(e.target.value))}
                className="pl-10"
              />
            </div>

            <select disabled={names.loading} aria-label={t('nav.saints')} value={selectedSaint} onChange={event => filterChanged(() => setSelectedSaint(event.target.value))} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="Todos los santos">{t('catalog.allSaints')}</option>
              {saints.map(saint => <option key={saint.id} value={saint.id}>{saint.name}</option>)}
            </select>

            <Select value={selectedType} onValueChange={value => filterChanged(() => setSelectedType(value))}>
              <SelectTrigger aria-label={t('catalog.allTypes')}>
                <SelectValue placeholder={t('catalog.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos los tipos">{t('catalog.allTypes')}</SelectItem>
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
              {t('catalog.onlyApproved')}
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

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary"><T k="catalog.miraclesCount" values={{ count: page?.total ?? '—' }} /></Badge>
            <Badge variant="outline"><T k="catalog.approvedCount" values={{ count: page?.metadata.approvedTotal ?? '—' }} /></Badge>
          </div>

          {loading ? <p role="status" className="mt-3 text-sm text-muted-foreground">{t('catalog.miraclesLoading')}</p> : null}
          {error ? <div role="alert" className="mt-3 space-y-2"><p className="text-sm text-destructive whitespace-pre-wrap">{t(error)}</p><Button onClick={() => { result.retry(); if (names.error) names.retry() }}>{t('content.retry')}</Button>{cursor && <Button onClick={() => setCursor(null)}>{t('catalog.firstPage')}</Button>}</div> : null}
        </CardContent>
      </Card>

      {!loading && !error && filteredMiracles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-playfair text-xl font-semibold mb-2">{t('catalog.miraclesEmpty')}</h3>
            <p className="text-muted-foreground">{t('catalog.adjustFilters')}</p>
          </CardContent>
        </Card>
      ) : (
        filteredMiracles.map((source) => <LocalCatalogRecord key={source.id} kind="miracle" source={source}>{(content,state)=>{
          const miracle={...content,description:content.details||"",verified:content.approved,witnesses:(content.witnesses||"").split(",").map(item=>item.trim()).filter(Boolean)}
          return (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="font-playfair text-xl mb-2 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-secondary" />
                    {miracle.title}
                  </CardTitle>
                  <p className="text-muted-foreground">
                    {t('catalog.attributedTo')}{" "}
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
                  {miracle.verified && <Badge variant="secondary">{t('catalog.approved')}</Badge>}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <p lang={state.translated.includes("details")?state.language:"es"} className="text-muted-foreground mb-4 leading-relaxed text-pretty whitespace-pre-wrap break-words">{miracle.description}</p>{state.language!=="es"&&!state.translated.includes("details")&&<small>{t("content.originalSpanish")}</small>}

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
                    <span><T k="catalog.witnessCount" values={{ count: miracle.witnesses.length }} /></span>
                  </div>
                )}
              </div>

              {miracle.witnesses && miracle.witnesses.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">{t('catalog.witnesses')}:</p>
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
        )}}</LocalCatalogRecord>)
      )}
      {page && <SaintPagePagination page={page} onCursor={setCursor} label="milagros" disabled={loading} />}
    </div>
  )
}
