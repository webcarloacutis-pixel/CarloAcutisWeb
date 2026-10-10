"use client"
import { useLanguage } from "@/contexts/language-context"
import Link from "next/link"
import { CatalogPagination, useCatalogPage } from "./catalog-pagination"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CONTINENTS, hasBirthCoordinates, type PublicSaint } from "@/lib/content-filters"
import { geographicName } from "@/lib/catalog-geography"
import { formatTranslation } from "@/lib/format-translation"
export function SaintsMapSidebar({ saints, allSaints }: { saints: PublicSaint[]; allSaints: PublicSaint[] }) {
  const { t, language } = useLanguage()
  const page = useCatalogPage(saints, 20)
  const located = saints.filter(hasBirthCoordinates).length
  return <div className="space-y-6">
    <Card><CardHeader><CardTitle className="font-playfair text-lg">{t("supplemental.birthSaints")}</CardTitle>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{formatTranslation(t("supplemental.locatedCount"), { count: saints.length, located })}</p>
    </CardHeader><CardContent>
      {!saints.length && <p className="text-sm">{t("catalog.saintsEmpty")}</p>}
      <ul className="space-y-4 max-h-[36rem] overflow-y-auto">
        {page.items.map((saint) => <li key={saint.id} className="p-3 rounded-lg border space-y-2">
          <h3 className="font-medium text-sm">{saint.name}</h3>
          <p className="text-xs text-muted-foreground">{saint.birthPlace || t("catalog.notDocumented")} · {saint.birthCountryCode ? geographicName(saint.birthCountryCode, language) : t("catalog.notDocumented")}</p>
          <p className="text-xs text-muted-foreground">{hasBirthCoordinates(saint) ? (saint.birthPrecision === "exact" ? t("supplemental.documentedPlace") : t("supplemental.approximateCity")) : t("supplemental.noBirthCoordinates")}</p>
          <Button asChild size="sm" variant="outline" className="w-full"><Link prefetch={false} href={"/santos/" + encodeURIComponent(saint.slug)} aria-label={formatTranslation(t("supplemental.detailsNamed"), { name: saint.name })}>{t("supplemental.details")}</Link></Button>
        </li>)}
      </ul>
      <CatalogPagination {...page} label={t("supplemental.mapSaints")} />
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="font-playfair text-lg">{t("supplemental.continentCatalog")}</CardTitle></CardHeader><CardContent>
      <dl className="space-y-2 text-sm">{CONTINENTS.map((continent) => <div key={continent.code} className="flex justify-between gap-2"><dt>{geographicName(continent.code, language)}</dt><dd>{allSaints.filter((saint) => saint.birthContinent === continent.code).length}</dd></div>)}
        <div className="flex justify-between gap-2"><dt>{t("catalog.notDocumented")}</dt><dd>{allSaints.filter((saint) => !CONTINENTS.some((continent) => continent.code === saint.birthContinent)).length}</dd></div>
      </dl>
    </CardContent></Card>
  </div>
}
