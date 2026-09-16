import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { PrayersIntroduction } from "@/components/prayers-introduction"
import { PrayersSearch } from "@/components/prayers-search"
import { PrayersCategories } from "@/components/prayers-categories"
import { FeaturedPrayers } from "@/components/featured-prayers"
import { PrayersResults } from "@/components/prayers-results"
import { ScrollToResults } from "@/components/scroll-to-results"
import { apiUrl } from "@/lib/api-url"
import { fetchPublicCollection } from "@/lib/public-collection"
import { getPopularityEstimates } from "@/lib/popularity-read"
import { filterPrayers, PRAYER_CATEGORIES, queryValue, type PublicPrayer } from "@/lib/content-filters"
export const dynamic = "force-dynamic"
export default async function OracionesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const values = await searchParams
  const [prayers, estimates] = await Promise.all([
    fetchPublicCollection<PublicPrayer>(apiUrl("/prayers/approved"), { cache: "no-store" }),
    getPopularityEstimates("prayer"),
  ])
  const query = queryValue(values, "q", "query", "busqueda"), saint = queryValue(values, "santo", "saint")
  const occasion = queryValue(values, "ocasion", "occasion"), category = queryValue(values, "categoria", "category")
  const unique = (items: (string | null | undefined)[]) => [...new Set(items.filter((item): item is string => Boolean(item)))].sort((a, b) => a.localeCompare(b, "es"))
  const filtered = filterPrayers(prayers, values)
  const featured = [...prayers].sort((a, b) => (Date.parse(b.updatedAt || "") || 0) - (Date.parse(a.updatedAt || "") || 0)).slice(0, 4).map((prayer) => ({ ...prayer, popularityEstimate: estimates[prayer.id] }))
  return <div className="min-h-screen bg-background"><Header />
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <PrayersIntroduction />
      <PrayersSearch key={JSON.stringify([query, saint, occasion, category])} saints={unique(prayers.map((prayer) => prayer.saintName))} occasions={unique(prayers.map((prayer) => prayer.occasion))} categories={unique([...PRAYER_CATEGORIES.map((item) => item.title), ...prayers.map((prayer) => prayer.category)])} initialQuery={query} initialSaint={saint} initialOccasion={occasion} initialCategory={category} />
      <PrayersCategories prayers={prayers} />
      <ScrollToResults />
      <FeaturedPrayers prayers={featured} />
      <section id="resultados" className="scroll-mt-24 space-y-4" aria-label="Resultados de oraciones"><h2 className="font-playfair text-2xl" aria-live="polite">{filtered.length} oraciones encontradas</h2><PrayersResults prayers={filtered} /></section>
    </main><Footer /></div>
}
