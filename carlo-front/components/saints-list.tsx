"use client"
import { PopularityEstimate } from "./popularity-estimate"
import type { PopularityEstimateData } from "@/lib/popularity-display"
import { T } from "@/components/t"
import { CatalogPagination, useCatalogPage } from "./catalog-pagination"
import Link from "next/link"
import { CatalogImage as Image } from "@/components/catalog-image"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin } from "lucide-react"
import { TranslatedText } from "@/components/translated-text"
import { countryName, type PublicSaint } from "@/lib/content-filters"
export type Saint = PublicSaint & { biographyExcerpt?: string | null; popularityEstimate?: PopularityEstimateData | null }

export function SaintsList({ saints, remoteTotal }: { saints: Saint[]; remoteTotal?: number }) {
  const page = useCatalogPage(saints, 12)
  return <div className="space-y-8">
    <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{remoteTotal ?? saints.length} santos encontrados</p>
    {saints.length === 0 && <p>No se encontraron santos con estos filtros.</p>}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {(remoteTotal === undefined ? page.items : saints).map((saint) => <Card key={saint.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <Image src={saint.imageUrl || "/placeholder.svg"} alt={saint.name} fill className="object-contain" sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4"><h3 className="font-playfair text-xl font-bold text-white mb-1">{saint.name}</h3><p className="text-white/90 text-sm">{saint.title || ""}</p></div>
        </div>
        <CardHeader className="pb-3">
          {saint.feastDay && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" aria-hidden="true" /><span>{saint.feastDay}</span></div>}
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /><span>Nacimiento: {saint.birthPlace ? saint.birthPlace + ", " : ""}{countryName(saint.birthCountryCode)}</span></div>
          {saint.canonizationYear != null && <p className="text-sm text-muted-foreground">Canonización: {saint.canonizationYear}</p>}
          {saint.deathYear != null && <p className="text-sm text-muted-foreground">Fallecimiento: {saint.deathYear}</p>}
        </CardHeader>
        <CardContent className="pt-0">
          {(saint.biographyExcerpt ?? saint.biography) && <p className="text-muted-foreground text-sm mb-4 line-clamp-3"><TranslatedText text={saint.biographyExcerpt ?? saint.biography ?? ""} /></p>}
          {Array.isArray(saint.patronOf) && <div className="flex flex-wrap gap-1 mb-4">{saint.patronOf.slice(0, 3).map((patron) => <Badge key={patron} variant="secondary">{patron}</Badge>)}{saint.patronOf.length > 3 && <Badge variant="outline">+{saint.patronOf.length - 3}</Badge>}</div>}
          <PopularityEstimate estimate={saint.popularityEstimate} />
          <Button asChild className="w-full bg-transparent" variant="outline"><Link prefetch={false} href={"/santos/" + encodeURIComponent(saint.slug)} aria-label={"Ver biografía de " + saint.name}><T k="common.readMore" /></Link></Button>
        </CardContent>
      </Card>)}
    </div>
    {remoteTotal === undefined && <CatalogPagination {...page} label="santos" />}
  </div>
}
