import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe } from "lucide-react"
export function MapLegend() {
  return <Card><CardHeader><CardTitle className="font-playfair flex items-center gap-2"><Globe className="h-5 w-5 text-primary" aria-hidden="true" />Leyenda del mapa</CardTitle></CardHeader>
    <CardContent className="space-y-3 text-sm text-muted-foreground">
      <p>Los marcadores indican lugares de nacimiento documentados. La ubicación de una ciudad es aproximada.</p>
      <p>El número agrupa los santos que comparten coordenadas. Abre el marcador para consultar todos sus enlaces.</p>
      <p>Los filtros de continente y país se aplican tanto al mapa como al listado. Los santos sin coordenadas siguen disponibles en el listado.</p>
      <p>Puedes navegar con el teclado, tocar un marcador y ampliar con dos dedos.</p>
    </CardContent></Card>
}
