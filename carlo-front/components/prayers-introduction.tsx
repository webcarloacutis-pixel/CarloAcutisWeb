import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, BookOpen, Star } from "lucide-react"

export function PrayersIntroduction() {
  return (
    <div className="space-y-8 mb-12">
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="font-playfair text-2xl flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            El Poder de la Oración de los Santos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed text-pretty mb-4">
            Las oraciones de los santos son tesoros espirituales forjados en la experiencia de hombres y mujeres que
            vivieron en íntima unión con Dios. Estas oraciones han sido probadas por el tiempo y han llevado consuelo,
            fortaleza y esperanza a millones de fieles a lo largo de los siglos.
          </p>
          <p className="text-muted-foreground leading-relaxed text-pretty">
            Cada oración refleja la sabiduría espiritual y la profunda relación con Dios de quien la compuso, ofreciendo
            palabras perfectas para expresar nuestros sentimientos más profundos ante el Altísimo.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-playfair flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-secondary" />
              Cómo Usar Esta Biblioteca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Busca por santo, ocasión o necesidad</li>
              <li>• Explora las categorías temáticas</li>
              <li>• Lee con devoción y recogimiento</li>
              <li>• Adapta las oraciones a tu situación</li>
              <li>• Practica la oración regularmente</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-playfair flex items-center gap-2">
              <Star className="h-5 w-5 text-accent" />
              Beneficios Espirituales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Fortalecimiento de la fe</li>
              <li>• Consuelo en momentos difíciles</li>
              <li>• Guía espiritual y sabiduría</li>
              <li>• Intercesión de los santos</li>
              <li>• Crecimiento en la vida interior</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
