import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { BookOpen, Hand as Hands, Sparkles, Heart } from "lucide-react"

const eucharistSteps = [
  {
    step: 1,
    title: "Liturgia de la Palabra",
    icon: BookOpen,
    description: "Preparación espiritual a través de las lecturas bíblicas y la homilía",
    details: [
      "Primera lectura (Antiguo Testamento)",
      "Salmo responsorial",
      "Segunda lectura (Nuevo Testamento)",
      "Evangelio",
      "Homilía del sacerdote",
    ],
    color: "text-primary",
  },
  {
    step: 2,
    title: "Presentación de las Ofrendas",
    icon: Hands,
    description: "Los fieles presentan el pan y el vino que serán consagrados",
    details: [
      "Procesión de las ofrendas",
      "Preparación del altar",
      "Oración sobre las ofrendas",
      "Lavado de manos del sacerdote",
    ],
    color: "text-secondary",
  },
  {
    step: 3,
    title: "Plegaria Eucarística",
    icon: Sparkles,
    description: "El momento central donde ocurre la transubstanciación",
    details: [
      "Prefacio y Santo",
      "Epíclesis (invocación al Espíritu Santo)",
      "Relato de la institución",
      "Anámnesis (memorial de la Pasión)",
      "Intercesiones",
    ],
    color: "text-accent",
  },
  {
    step: 4,
    title: "Comunión",
    icon: Heart,
    description: "Los fieles reciben el Cuerpo y la Sangre de Cristo",
    details: [
      "Padrenuestro",
      "Rito de la paz",
      "Fracción del pan",
      "Comunión de los fieles",
      "Oración después de la comunión",
    ],
    color: "text-primary",
  },
]

export function EucharistSteps() {
  return (
    <div className="space-y-8 mb-12">
      <div className="text-center">
        <h2 className="font-playfair text-3xl font-bold text-foreground mb-4">Cómo se Celebra la Eucaristía</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          La celebración eucarística sigue un orden sagrado establecido por la tradición de la Iglesia
        </p>
      </div>

      <div className="space-y-6">
        {eucharistSteps.map((step, index) => {
          const IconComponent = step.icon
          return (
            <Card key={step.step} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                    <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                      {step.step}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <CardTitle className="font-playfair text-xl flex items-center gap-2">
                      <IconComponent className={`h-5 w-5 ${step.color}`} />
                      {step.title}
                    </CardTitle>
                    <p className="text-muted-foreground text-sm mt-1">{step.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="ml-16">
                  <h4 className="font-medium text-foreground mb-3">Elementos principales:</h4>
                  <ul className="space-y-2">
                    {step.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                        <span className="text-sm">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              {index < eucharistSteps.length - 1 && <Separator className="mx-6" />}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
