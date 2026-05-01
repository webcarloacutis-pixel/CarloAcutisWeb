import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cross, Crown, Move as Dove, Fish, Flame, TreePine } from "lucide-react"

const symbolCategories = [
  {
    title: "Símbolos Cristológicos",
    icon: Cross,
    description: "Símbolos que representan a Jesucristo",
    symbols: ["Cruz", "INRI", "Cordero", "Pez (IXTHYS)", "Pan y Vino", "Corazón Sagrado"],
    color: "text-primary",
  },
  {
    title: "Símbolos Marianos",
    icon: Crown,
    description: "Símbolos dedicados a la Virgen María",
    symbols: ["Rosa Mística", "Estrella del Mar", "Luna", "Lirio", "Corona", "Inmaculado Corazón"],
    color: "text-secondary",
  },
  {
    title: "Símbolos del Espíritu Santo",
    icon: Dove,
    description: "Representaciones de la Tercera Persona de la Trinidad",
    symbols: ["Paloma", "Fuego", "Viento", "Agua", "Aceite", "Lenguas de Fuego"],
    color: "text-accent",
  },
  {
    title: "Símbolos Sacramentales",
    icon: Fish,
    description: "Elementos relacionados con los sacramentos",
    symbols: ["Agua Bautismal", "Crisma", "Anillos", "Cáliz", "Hostia", "Óleo Santo"],
    color: "text-primary",
  },
  {
    title: "Símbolos Litúrgicos",
    icon: Flame,
    description: "Elementos usados en la liturgia",
    symbols: ["Cirio Pascual", "Incienso", "Campanas", "Vestiduras", "Altar", "Ambón"],
    color: "text-secondary",
  },
  {
    title: "Símbolos Naturales",
    icon: TreePine,
    description: "Elementos de la naturaleza con significado espiritual",
    symbols: ["Vid", "Olivo", "Cedro", "Trigo", "Uva", "Roca"],
    color: "text-accent",
  },
]

export function SymbolsCategories() {
  return (
    <div className="space-y-8 mb-12">
      <div className="text-center">
        <h2 className="font-playfair text-3xl font-bold text-foreground mb-4">Categorías de Símbolos</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Los símbolos católicos se organizan en diferentes categorías según su significado y uso litúrgico
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {symbolCategories.map((category, index) => {
          const IconComponent = category.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-3 rounded-full bg-muted">
                  <IconComponent className={`h-8 w-8 ${category.color}`} />
                </div>
                <CardTitle className="font-playfair text-lg">{category.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground text-sm">Símbolos principales:</h4>
                  <div className="flex flex-wrap gap-1">
                    {category.symbols.map((symbol, symbolIndex) => (
                      <Badge key={symbolIndex} variant="outline" className="text-xs">
                        {symbol}
                      </Badge>
                    ))}
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
