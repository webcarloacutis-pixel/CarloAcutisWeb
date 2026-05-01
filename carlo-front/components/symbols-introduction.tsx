import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, Heart, Star } from "lucide-react"

export function SymbolsIntroduction() {
  return (
    <div className="space-y-8 mb-12">
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardHeader>
          <CardTitle className="font-playfair text-2xl flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" />
            El Lenguaje de los Símbolos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed text-pretty mb-4">
            Los símbolos católicos son mucho más que simples decoraciones o imágenes. Son un lenguaje sagrado que
            comunica verdades profundas de la fe, conectando lo visible con lo invisible, lo terrenal con lo divino.
          </p>
          <p className="text-muted-foreground leading-relaxed text-pretty">
            Cada símbolo tiene capas de significado que se han desarrollado a lo largo de siglos de tradición cristiana,
            ayudando a los fieles a comprender y vivir los misterios de la fe de manera más profunda.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-playfair flex items-center gap-2">
              <Heart className="h-5 w-5 text-secondary" />
              Propósito de los Símbolos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Enseñar verdades de fe de manera visual</li>
              <li>• Facilitar la oración y meditación</li>
              <li>• Conectar con la tradición apostólica</li>
              <li>• Inspirar devoción y reverencia</li>
              <li>• Unificar a los fieles en la fe común</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-playfair flex items-center gap-2">
              <Star className="h-5 w-5 text-accent" />
              Origen Histórico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-pretty">
              Muchos símbolos católicos tienen sus raíces en los primeros siglos del cristianismo, cuando los cristianos
              usaban símbolos secretos para identificarse y comunicar su fe durante las persecuciones. Con el tiempo,
              estos símbolos evolucionaron y se enriquecieron con nuevos significados.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
