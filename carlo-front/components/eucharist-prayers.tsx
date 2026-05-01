import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen } from "lucide-react"

const eucharistPrayers = [
  {
    title: "Oración antes de la Comunión",
    text: "Señor, no soy digno de que entres en mi casa, pero una palabra tuya bastará para sanarme. Prepara mi corazón para recibir tu Cuerpo y tu Sangre con fe, amor y reverencia.",
    occasion: "Antes de recibir la comunión",
  },
  {
    title: "Oración después de la Comunión",
    text: "Gracias, Jesús, por venir a mi corazón. Ayúdame a vivir siempre en tu gracia y a ser testimonio de tu amor en el mundo. Que tu presencia en mí transforme mi vida y me acerque cada día más a ti.",
    occasion: "Después de recibir la comunión",
  },
  {
    title: "Acto de Fe Eucarística",
    text: "Creo firmemente que en la Eucaristía estás presente Tú, Jesús, verdadero Dios y verdadero hombre, con tu Cuerpo, Sangre, Alma y Divinidad. Te adoro con profunda humildad y te amo sobre todas las cosas.",
    occasion: "Para la adoración eucarística",
  },
  {
    title: "Oración de Acción de Gracias",
    text: "Te doy gracias, Padre celestial, por el don inefable de la Eucaristía. Por medio de tu Hijo Jesús, nos das el alimento que necesitamos para el camino hacia la vida eterna. Bendito seas por siempre.",
    occasion: "En acción de gracias por la Eucaristía",
  },
]

export function EucharistPrayers() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-playfair text-3xl font-bold text-foreground mb-4">Oraciones Eucarísticas</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Oraciones tradicionales para acompañar la recepción de la Sagrada Eucaristía
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {eucharistPrayers.map((prayer, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="font-playfair flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {prayer.title}
              </CardTitle>
              <Badge variant="outline" className="w-fit">
                {prayer.occasion}
              </Badge>
            </CardHeader>
            <CardContent>
              <blockquote className="text-muted-foreground italic leading-relaxed text-pretty">
                "{prayer.text}"
              </blockquote>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="font-playfair text-xl text-center">Preparación para la Comunión</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-muted-foreground">
            <p className="text-center leading-relaxed">
              Para recibir dignamente la Sagrada Comunión, es importante preparar el alma:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <h4 className="font-medium text-foreground mb-2">Estado de Gracia</h4>
                <p>Estar libre de pecado mortal a través del sacramento de la Reconciliación</p>
              </div>
              <div className="text-center">
                <h4 className="font-medium text-foreground mb-2">Ayuno Eucarístico</h4>
                <p>Abstenerse de alimentos sólidos al menos una hora antes de comulgar</p>
              </div>
              <div className="text-center">
                <h4 className="font-medium text-foreground mb-2">Disposición Interior</h4>
                <p>Acercarse con fe, amor, reverencia y deseo de unirse a Cristo</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
