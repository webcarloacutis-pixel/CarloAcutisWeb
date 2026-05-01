import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Heart } from "lucide-react"

const featuredPrayers = [
  {
    title: "Oración de San Francisco de Asís",
    saint: "San Francisco de Asís",
    text: "Señor, haz de mí un instrumento de tu paz. Donde haya odio, que yo lleve el amor. Donde haya ofensa, que yo lleve el perdón. Donde haya discordia, que yo lleve la unión. Donde haya duda, que yo lleve la fe.",
    occasion: "Paz y reconciliación",
    popularity: 98,
  },
  {
    title: "Oración de Santa Teresa de Jesús",
    saint: "Santa Teresa de Jesús",
    text: "Nada te turbe, nada te espante, todo se pasa, Dios no se muda. La paciencia todo lo alcanza; quien a Dios tiene nada le falta: sólo Dios basta.",
    occasion: "Tranquilidad y confianza",
    popularity: 95,
  },
  {
    title: "Oración de San Ignacio de Loyola",
    saint: "San Ignacio de Loyola",
    text: "Toma, Señor, y recibe toda mi libertad, mi memoria, mi entendimiento y toda mi voluntad, todo mi haber y mi poseer; tú me lo diste, a ti, Señor, lo torno.",
    occasion: "Entrega total a Dios",
    popularity: 92,
  },
  {
    title: "Oración de Santa Teresita del Niño Jesús",
    saint: "Santa Teresita del Niño Jesús",
    text: "Oh Jesús mío, yo sé bien que el amor se paga sólo con amor, por eso he buscado, he encontrado el medio de aliviar mi corazón devolviéndote amor por amor.",
    occasion: "Amor a Jesús",
    popularity: 89,
  },
]

type FeaturedPrayersProps = {
  prayers?: any[];
};

export function FeaturedPrayers({ prayers: _prayers }: FeaturedPrayersProps) {

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-playfair text-3xl font-bold text-foreground mb-4 flex items-center justify-center gap-2">
          <Star className="h-8 w-8 text-primary" />
          Oraciones Destacadas
        </h2>
        <p className="text-muted-foreground">Las oraciones más queridas y rezadas por nuestra comunidad</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {featuredPrayers.map((prayer, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="font-playfair text-lg mb-2">{prayer.title}</CardTitle>
                  <div className="flex gap-2 mb-2">
                    <Badge variant="secondary">{prayer.saint}</Badge>
                    <Badge variant="outline">{prayer.occasion}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Heart className="h-3 w-3 fill-primary text-primary" />
                  <span>{prayer.popularity}%</span>
                </div>
              </div>
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
          <CardTitle className="font-playfair text-xl text-center">Cómo Orar con los Santos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <h4 className="font-medium text-foreground mb-2">1. Preparación</h4>
              <p className="text-sm text-muted-foreground">
                Busca un lugar tranquilo, haz la señal de la cruz y recógete en presencia de Dios
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">2. Oración</h4>
              <p className="text-sm text-muted-foreground">
                Lee la oración con devoción, meditando cada palabra y uniéndote al espíritu del santo
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">3. Reflexión</h4>
              <p className="text-sm text-muted-foreground">
                Permanece en silencio, permite que las palabras penetren en tu corazón y pide la intercesión del santo
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
