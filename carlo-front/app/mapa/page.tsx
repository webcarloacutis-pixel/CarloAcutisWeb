import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SaintsExplorer } from "@/components/saints-explorer"
import { apiUrl } from "@/lib/api-url"
import { fetchPublicCollection } from "@/lib/public-collection"
import type { PublicSaint } from "@/lib/content-filters"
export const dynamic = "force-dynamic"
export default async function MapPage() {
  const saints = await fetchPublicCollection<PublicSaint>(apiUrl("/saints"), { cache: "no-store" })
  return <div className="min-h-screen bg-background"><Header />
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8"><div className="ornate-divider w-32 mx-auto mb-6" />
        <h1 className="font-playfair text-4xl md:text-5xl font-bold text-foreground mb-4">Mapa Mundial de Santos</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">Explora los lugares de nacimiento documentados de los santos. Filtra por continente y país y abre un marcador para conocer sus historias.</p>
        <div className="ornate-divider w-32 mx-auto mt-6" /></div>
      <SaintsExplorer saints={saints} mapOnly />
    </main><Footer /></div>
}
