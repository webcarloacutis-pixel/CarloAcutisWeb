import { T } from "@/components/t";

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, Shield, Sun, Anchor, Move as Dove, Mountain } from "lucide-react"

const emotionalCategories = [
  {
    title: "Miedo y Ansiedad",
    icon: Shield,
    color: "text-secondary",
    emotions: ["miedo", "ansiedad", "preocupación", "estrés"],
    description: "Encuentra paz y protección en las promesas de Dios",
    verseCount: 15,
  },
  {
    title: "Tristeza y Dolor",
    icon: Heart,
    color: "text-accent",
    emotions: ["tristeza", "dolor", "duelo", "soledad"],
    description: "Consuelo divino para los momentos más difíciles",
    verseCount: 18,
  },
  {
    title: "Esperanza y Alegría",
    icon: Sun,
    color: "text-primary",
    emotions: ["esperanza", "alegría", "felicidad", "gratitud"],
    description: "Celebra las bendiciones y mantén viva la esperanza",
    verseCount: 22,
  },
  {
    title: "Fe y Confianza",
    icon: Anchor,
    color: "text-secondary",
    emotions: ["fe", "confianza", "duda", "fortaleza"],
    description: "Fortalece tu fe y confía en el plan de Dios",
    verseCount: 20,
  },
  {
    title: "Paz y Tranquilidad",
    icon: Dove,
    color: "text-accent",
    emotions: ["paz", "tranquilidad", "calma", "serenidad"],
    description: "Encuentra la paz que sobrepasa todo entendimiento",
    verseCount: 16,
  },
  {
    title: "Fortaleza y Valor",
    icon: Mountain,
    color: "text-primary",
    emotions: ["fortaleza", "valor", "perseverancia", "resistencia"],
    description: "Recibe fuerzas para enfrentar cualquier desafío",
    verseCount: 14,
  },
]

export function EmotionalCategories() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-playfair text-3xl font-bold text-foreground mb-4">Categorías Emocionales</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Explora versículos organizados por diferentes estados emocionales y situaciones de la vida
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {emotionalCategories.map((category, index) => {
          const IconComponent = category.icon
          return (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-3 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                  <IconComponent className={`h-8 w-8 ${category.color}`} />
                </div>
                <CardTitle className="font-playfair text-xl">{category.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {category.emotions.map((emotion, emotionIndex) => (
                      <Badge key={emotionIndex} variant="outline" className="text-xs">
                        {emotion}
                      </Badge>
                    ))}
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">{category.verseCount} versículos disponibles</p>
                    <Link
                      href={`/versiculos?categoria=${category.title.toLowerCase().replace(/\s+/g, "-")}`}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full"
                    >
                      <T k="footer.explore" /> Versículos
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
