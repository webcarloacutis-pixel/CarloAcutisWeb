import { T } from "@/components/t"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SaintsExplorer } from "@/components/saints-explorer"
import { apiUrl } from "@/lib/api-url"
import { fetchPublicCollection } from "@/lib/public-collection"
import type { PublicSaint } from "@/lib/content-filters"
export const dynamic = "force-dynamic"
export type Saint = PublicSaint
export default async function SaintsPage() {
  const saints = await fetchPublicCollection<PublicSaint>(apiUrl("/saints"), { cache: "no-store" })
  return <div className="min-h-screen bg-background"><Header />
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12"><div className="ornate-divider w-32 mx-auto mb-8" />
        <h1 className="font-playfair text-4xl md:text-5xl font-bold text-foreground mb-4"><T k="saints.title" /></h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">Descubre las historias extraordinarias de hombres y mujeres que dedicaron sus vidas a Dios y se convirtieron en ejemplos de santidad para toda la humanidad.</p>
        <div className="ornate-divider w-32 mx-auto mt-8" /></div>
      <SaintsExplorer saints={saints} />
    </main><Footer /></div>
}
