"use client"
import { PopularityEstimate } from "./popularity-estimate"
import type { PopularityEstimateData } from "@/lib/popularity-display"
import { T } from "@/components/t"
import { CatalogPagination, useCatalogPage } from "./catalog-pagination"
import Link from "next/link"
import { CatalogImage as Image } from "@/components/catalog-image"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Calendar, MapPin } from "lucide-react"
import { useCatalogLocalization } from "@/lib/use-catalog-localization"
import { type PublicSaint } from "@/lib/content-filters"
import { useLanguage } from '@/contexts/language-context'
import { formatTranslation } from '@/lib/format-translation'
import { GeographicName } from './geographic-name'
export type Saint = PublicSaint & { biographyExcerpt?: string | null; biographySourceHash?: string | null; popularityEstimate?: PopularityEstimateData | null }

export function SaintsList({ saints, remoteTotal, returnTo }: { saints: Saint[]; remoteTotal?: number; returnTo?: string }) {
  const { t } = useLanguage()
  const page = useCatalogPage(saints, 12)
  return <div className="space-y-8">
    <p role="status" aria-live="polite" className="text-sm text-muted-foreground"><T k="catalog.saintsCount" values={{ count: remoteTotal ?? saints.length }} /></p>
    {saints.length === 0 && <p>{t('catalog.saintsEmpty')}</p>}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {(remoteTotal === undefined ? page.items : saints).map((saint) => <LocalizedSaintCard key={saint.id} source={saint} returnTo={returnTo} />)}
    </div>
    {remoteTotal === undefined && <CatalogPagination {...page} label="santos" />}
  </div>
}

function LocalizedSaintCard({source,returnTo}:{source:Saint;returnTo?:string}){
  const {t}=useLanguage()
  const localized=useCatalogLocalization("saint",source)
  const saint=localized.content
  const detailQuery=new URLSearchParams()
  if(returnTo)detailQuery.set("returnTo",returnTo)
  if(localized.language!=="es" || returnTo && new URL(returnTo,"https://catalog.invalid").searchParams.has("lang"))detailQuery.set("lang",localized.language)
  return <Link prefetch={false}
        href={"/santos/" + encodeURIComponent(saint.slug) + (detailQuery.size ? "?" + detailQuery : "")}
        aria-label={formatTranslation(t('catalog.readBiography'), { name: saint.name })}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Card className="group h-full hover:shadow-lg transition-all duration-300 motion-reduce:transition-none overflow-hidden">
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          <Image src={saint.imageUrl || "/placeholder.svg"} alt={saint.name} fill className="object-contain" sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4"><h3 className="font-playfair text-xl font-bold text-white mb-1">{saint.name}</h3><p className="text-white/90 text-sm">{saint.title || ""}</p></div>
        </div>
        <CardHeader className="pb-3">
          {saint.feastDay && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" aria-hidden="true" /><span>{saint.feastDay}</span></div>}
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{t('catalog.birth')}: {saint.birthPlace ? saint.birthPlace + ", " : ""}<GeographicName code={saint.birthCountryCode} /></span></div>
          {saint.canonizationYear != null && <p className="text-sm text-muted-foreground">{t('catalog.canonization')}: {saint.canonizationYear}</p>}
          {saint.deathYear != null && <p className="text-sm text-muted-foreground">{t('catalog.death')}: {saint.deathYear}</p>}
        </CardHeader>
        <CardContent className="pt-0">
          {(saint.biographyExcerpt ?? saint.biography) && <p className="text-muted-foreground text-sm mb-4 line-clamp-3"><span lang={localized.translated.includes("biographyExcerpt") || localized.translated.includes("biography") ? localized.language : "es"}>{saint.biographyExcerpt ?? saint.biography}</span>{localized.language !== "es" && !localized.translated.includes("biographyExcerpt") && !localized.translated.includes("biography") && <small className="block">{t("content.originalSpanish")}</small>}</p>}
          {Array.isArray(saint.patronOf) && <div className="flex flex-wrap gap-1 mb-4">{saint.patronOf.slice(0, 3).map((patron) => <Badge key={patron} variant="secondary">{patron}</Badge>)}{saint.patronOf.length > 3 && <Badge variant="outline">+{saint.patronOf.length - 3}</Badge>}</div>}
          <PopularityEstimate estimate={saint.popularityEstimate} />
          <span className={buttonVariants({ variant: "outline", className: "w-full bg-transparent" })}><T k="common.readMore" /></span>
        </CardContent>
      </Card></Link>
}
