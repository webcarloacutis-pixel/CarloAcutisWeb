import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Church, Heart, Crown } from "lucide-react"

export function EucharistIntroduction() {
  return (
    <div className="space-y-8 mb-12">
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="font-playfair text-2xl flex items-center gap-2">
            <Church className="h-6 w-6 text-primary" />
            ¿Qué es la Eucaristía?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed text-pretty mb-4">
            La Eucaristía es el sacramento central de la fe católica, instituido por Jesucristo en la Última Cena. En
            este sacramento, el pan y el vino se convierten verdaderamente en el Cuerpo y la Sangre de Cristo a través
            del misterio de la transubstanciación.
          </p>
          <p className="text-muted-foreground leading-relaxed text-pretty">
            La palabra "Eucaristía" proviene del griego "eukharistia", que significa "acción de gracias". Es el momento
            más sagrado de la Misa, donde los fieles reciben a Cristo mismo bajo las especies del pan y el vino.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-playfair flex items-center gap-2">
              <Heart className="h-5 w-5 text-secondary" />
              Significado Espiritual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Unión íntima con Cristo</li>
              <li>• Perdón de los pecados veniales</li>
              <li>• Fortalecimiento de la gracia</li>
              <li>• Unidad con la Iglesia</li>
              <li>• Anticipación de la gloria eterna</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-playfair flex items-center gap-2">
              <Crown className="h-5 w-5 text-accent" />
              Fundamento Bíblico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <blockquote className="text-muted-foreground italic mb-2">
              "Tomad, comed; esto es mi cuerpo... Bebed de ella todos; porque esto es mi sangre del nuevo pacto, que por
              muchos es derramada para remisión de los pecados."
            </blockquote>
            <cite className="text-primary text-sm">— Mateo 26:26-28</cite>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
