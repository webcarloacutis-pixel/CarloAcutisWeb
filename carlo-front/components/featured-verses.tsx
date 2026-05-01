import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"

const featuredVerses = [
  {
    text: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.",
    reference: "Isaías 41:10",
    emotion: "miedo",
    popularity: 95,
  },
  {
    text: "Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.",
    reference: "Mateo 11:28",
    emotion: "cansancio",
    popularity: 92,
  },
  {
    text: "La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón, ni tenga miedo.",
    reference: "Juan 14:27",
    emotion: "paz",
    popularity: 89,
  },
  {
    text: "Todo lo puedo en Cristo que me fortalece.",
    reference: "Filipenses 4:13",
    emotion: "fortaleza",
    popularity: 94,
  },
]

export function FeaturedVerses() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-playfair text-3xl font-bold text-foreground mb-4 flex items-center justify-center gap-2">
          <Star className="h-8 w-8 text-primary" />
          Versículos Más Buscados
        </h2>
        <p className="text-muted-foreground">Los versículos que más consuelo han brindado a nuestra comunidad</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {featuredVerses.map((verse, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <Badge variant="secondary" className="text-xs">
                  {verse.emotion}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <span>{verse.popularity}% útil</span>
                </div>
              </div>

              <blockquote className="text-lg text-foreground mb-4 leading-relaxed italic text-pretty">
                "{verse.text}"
              </blockquote>
              <cite className="text-primary font-medium">— {verse.reference}</cite>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
