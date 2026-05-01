import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Users, Globe } from "lucide-react"

export function MapLegend() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-playfair flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Leyenda del Mapa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-secondary border-2 border-white"></div>
            <span className="text-sm text-muted-foreground">Marcador de país con santos</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-secondary border-2 border-white flex items-center justify-center">
              <span className="text-xs font-bold text-white">3</span>
            </div>
            <span className="text-sm text-muted-foreground">Número indica cantidad de santos en el país</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Haz clic en los marcadores para ver detalles</span>
          </div>
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-accent" />
            <span className="text-sm text-muted-foreground">Usa la barra lateral para filtrar por continente</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
