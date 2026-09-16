import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ScriptureSearchAdvanced } from "@/components/scripture-search-advanced"
import { FeaturedVerses } from "@/components/featured-verses"
import { EmotionalCategories } from "@/components/emotional-categories"
import { getPopularityEstimates } from "@/lib/popularity-read"
export const dynamic = "force-dynamic"
export default async function VersiculosPage() {
  const estimates = await getPopularityEstimates("verse")
  return <div className="min-h-screen bg-background"><Header />
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div className="text-center mb-12"><div className="ornate-divider w-32 mx-auto mb-8" />
        <h1 className="font-playfair text-4xl md:text-5xl font-bold text-foreground mb-4">Versículos para el Alma</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">Encuentra consuelo, esperanza y guía en las Sagradas Escrituras. Describe cómo te sientes y descubre versículos que hablen directamente a tu corazón.</p><div className="ornate-divider w-32 mx-auto mt-8" /></div>
      <ScriptureSearchAdvanced /><EmotionalCategories /><FeaturedVerses estimates={estimates} />
    </main><Footer /></div>
}
