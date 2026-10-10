"use client"
import { useLanguage } from "@/contexts/language-context"
import { useState, useTransition } from "react"
import { useHydrated } from "@/lib/use-hydrated"
import { useRouter } from "next/navigation"
import { Search, Filter, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { categoryKey, PRAYER_CATEGORIES } from "@/lib/content-filters"
type Props = { saints: string[]; occasions: string[]; categories?: string[]; initialQuery?: string; initialSaint?: string; initialOccasion?: string; initialCategory?: string }
const selectClass = "block h-10 w-full rounded-md border border-input bg-background px-3 py-0 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
export function PrayersSearch({ saints, occasions, categories = [], initialQuery = "", initialSaint = "", initialOccasion = "", initialCategory = "" }: Props) {
  const { t, language } = useLanguage()
  const hydrated = useHydrated()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState(initialQuery)
  const [saint, setSaint] = useState(saints.find((item) => categoryKey(item) === categoryKey(initialSaint)) || initialSaint)
  const [occasion, setOccasion] = useState(occasions.find((item) => categoryKey(item) === categoryKey(initialOccasion)) || initialOccasion)
  const [category, setCategory] = useState(categories.find((item) => categoryKey(item) === categoryKey(initialCategory)) || initialCategory)
  const [showMore, setShowMore] = useState(Boolean(initialCategory))
  const categoryLabel = (value: string) => {
    const index = PRAYER_CATEGORIES.findIndex(item => categoryKey(item.title) === categoryKey(value))
    return index < 0 ? value : t(`supplemental.prayerCategory.${index}.title`)
  }
  const options = (items: string[], selected: string) => [...new Set([...items, ...(selected ? [selected] : [])])].sort((a, b) => a.localeCompare(b, language))
  function search() {
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (saint) params.set("santo", saint)
    if (occasion) params.set("ocasion", occasion)
    if (category) params.set("categoria", category)
    startTransition(() => router.push("/oraciones" + (params.size ? "?" + params + "#resultados" : "")))
  }
  function clear() {
    setQuery(""); setSaint(""); setOccasion(""); setCategory("")
    startTransition(() => router.push("/oraciones"))
  }
  return <Card>
    <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3">
      <CardTitle className="text-lg flex items-center gap-2"><Search className="h-5 w-5" aria-hidden="true" />{t("supplemental.searchPrayers")}</CardTitle>
      <Button disabled={!hydrated} type="button" variant="outline" size="icon" aria-label={t("supplemental.morePrayerFilters")} aria-expanded={showMore} aria-controls="prayer-extra-filters" onClick={() => setShowMore((value) => !value)}><Filter className="h-4 w-4" aria-hidden="true" /></Button>
    </div></CardHeader>
    <CardContent><form onSubmit={(event) => { event.preventDefault(); search() }} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <label className="md:col-span-4 text-sm space-y-2"><span>{t("supplemental.searchPrayerText")}</span><Input disabled={!hydrated} aria-label={t("supplemental.searchPrayerText")} value={query} maxLength={200} onChange={(event) => setQuery(event.target.value)} /></label>
      <label className="md:col-span-3 text-sm space-y-2"><span>{t("supplemental.saint")}</span><select disabled={!hydrated} aria-label={t("supplemental.saint")} className={selectClass} value={saint} onChange={(event) => setSaint(event.target.value)}><option value="">{t("catalog.allSaints")}</option>{options(saints, saint).map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="md:col-span-3 text-sm space-y-2"><span>{t("catalog.occasion")}</span><select disabled={!hydrated} aria-label={t("catalog.occasion")} className={selectClass} value={occasion} onChange={(event) => setOccasion(event.target.value)}><option value="">{t("supplemental.allOccasions")}</option>{options(occasions, occasion).map((item) => <option key={item}>{item}</option>)}</select></label>
      <div className="md:col-span-2 flex gap-2"><Button type="submit" className="w-full" disabled={!hydrated || pending}>{t("common.search")}</Button><Button type="button" variant="outline" size="icon" aria-label={t("supplemental.clearPrayerSearch")} onClick={clear} disabled={!hydrated || pending}><X className="h-4 w-4" aria-hidden="true" /></Button></div>
      {showMore && <label id="prayer-extra-filters" className="md:col-span-6 text-sm space-y-2"><span>{t("supplemental.category")}</span><select disabled={!hydrated} aria-label={t("supplemental.category")} className={selectClass} value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{t("supplemental.allCategories")}</option>{options(categories, category).map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}</select></label>}
    </form></CardContent>
  </Card>
}
