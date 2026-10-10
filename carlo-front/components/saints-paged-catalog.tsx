"use client"
import { useSearchParams } from "next/navigation"
import { SaintsFilters } from "./saints-filters"
import { SaintsList } from "./saints-list"
import { SaintPagePagination } from "./saint-page-pagination"
import { Button } from "./ui/button"
import { apiUrl } from "@/lib/api-url"
import { readSaintFilters, type SaintFilters } from "@/lib/content-filters"
import { canonicalFilterCountry, saintFilterCountries, saintPageUrl } from "@/lib/saint-pages"
import { useSaintPage } from "@/lib/use-saint-page"
import { useLanguage } from '@/contexts/language-context'

export function SaintsPagedCatalog() {
  const { t } = useLanguage()
  const params = useSearchParams()
  const parsed = readSaintFilters(new URLSearchParams(params.toString()))
  const cursor = params.get("cursor") || ""
  const { page, previousPage, loading, error, retry } = useSaintPage(apiUrl(saintPageUrl(parsed, cursor)))
  const facets = (page || previousPage)?.metadata.facets.countries || []
  const filters = { ...parsed, country: canonicalFilterCountry(parsed.country, facets) }
  const countries = saintFilterCountries(facets, filters.continent)
  function navigate(next: SaintFilters, nextCursor: string | null = null, replace = false) {
    if (next.continent !== filters.continent && next.country && !saintFilterCountries(facets, next.continent).some(item => item.code === next.country)) next = { ...next, country: "" }
    const query = new URLSearchParams()
    if (next.query) query.set("q", next.query)
    if (next.continent) query.set("continent", next.continent)
    if (next.country) query.set("country", next.country)
    if (next.century) query.set("century", next.century)
    if (nextCursor) query.set("cursor", nextCursor)
    const url = "/santos" + (query.size ? "?" + query : "")
    // Native history integrates with Next search params and never scrolls the document.
    if (replace) window.history.replaceState(null, "", url)
    else window.history.pushState(null, "", url)
  }
  return <section aria-busy={loading} style={{ overflowAnchor: "none" }}>
    <SaintsFilters filters={filters} countries={countries} onChange={(next, replace) => navigate(next, null, replace)} />
    {loading && <p role="status">{t('catalog.saintsLoading')}</p>}
    {error && <div role="alert" className="space-y-3"><p>{t(error)}</p><Button onClick={retry}>{t('content.retry')}</Button>{cursor && <Button variant="outline" onClick={() => navigate(filters)}>{t('catalog.firstPage')}</Button>}</div>}
    {page && !error && <>
      <p className="text-sm text-muted-foreground mb-4">{t(page.rankingMode === 'ai-estimate' ? 'catalog.orderAi' : 'catalog.orderAlphabetical')}</p>
      <SaintsList saints={page.items} remoteTotal={page.total} />
      <SaintPagePagination page={page} onCursor={next => navigate(filters, next)} disabled={loading} />
    </>}
  </section>
}
