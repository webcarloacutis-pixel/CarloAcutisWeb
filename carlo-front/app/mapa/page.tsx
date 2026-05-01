import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WorldMapLeaflet } from "@/components/world-map-leaflet"
import { MapLegend } from "@/components/map-legend"
import { SaintsMapSidebar } from "@/components/saints-map-sidebar"

export default function MapPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <div className="ornate-divider w-32 mx-auto mb-6"></div>
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-foreground mb-4">Mapa Mundial de Santos</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Explora santos de todo el mundo con nuestro mapa interactivo de alta precisión. Haz clic en los marcadores
            para descubrir los santos de cada región y conocer sus historias extraordinarias.
          </p>
          <div className="ornate-divider w-32 mx-auto mt-6"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-card rounded-lg border p-4 mb-4">
              <WorldMapLeaflet />
            </div>
            <MapLegend />
          </div>
          <div className="lg:col-span-1">
            <SaintsMapSidebar />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
