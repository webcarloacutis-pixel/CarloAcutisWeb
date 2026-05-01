import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wheat, Wine, Cross, Globe } from "lucide-react"

const eucharistSymbols = [
  {
    symbol: "Pan",
    icon: Wheat,
    meaning: "Cuerpo de Cristo",
    description:
      "El pan representa el Cuerpo de Cristo entregado por nosotros. Es el alimento espiritual que nos da vida eterna.",
    significance: ["Vida", "Sustento", "Unidad", "Sacrificio"],
  },
  {
    symbol: "Vino",
    icon: Wine,
    meaning: "Sangre de Cristo",
    description:
      "El vino se convierte en la Sangre de Cristo, derramada para el perdón de los pecados y la nueva alianza.",
    significance: ["Redención", "Alianza", "Perdón", "Vida nueva"],
  },
  {
    symbol: "Cruz",
    icon: Cross,
    meaning: "Sacrificio Redentor",
    description:
      "La Eucaristía hace presente el sacrificio de Cristo en la cruz, actualizado de manera incruenta en cada Misa.",
    significance: ["Salvación", "Amor divino", "Entrega total", "Victoria"],
  },
  {
    symbol: "Altar",
    icon: Globe,
    meaning: "Mesa del Señor",
    description:
      "El altar representa tanto la mesa de la Última Cena como el Calvario, donde se ofrece el sacrificio eucarístico.",
    significance: ["Encuentro", "Comunión", "Sacrificio", "Presencia"],
  },
]

export function EucharistMeaning() {
  return (
    <div className="space-y-8 mb-12">
      <div className="text-center">
        <h2 className="font-playfair text-3xl font-bold text-foreground mb-4">Simbolismo Eucarístico</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Cada elemento de la Eucaristía tiene un profundo significado espiritual que nos conecta con el misterio de la
          salvación
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {eucharistSymbols.map((item, index) => {
          const IconComponent = item.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="font-playfair flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <span className="text-xl">{item.symbol}</span>
                    <p className="text-sm text-muted-foreground font-normal">{item.meaning}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 leading-relaxed text-pretty">{item.description}</p>

                <div>
                  <h4 className="font-medium text-foreground mb-2">Significados espirituales:</h4>
                  <div className="flex flex-wrap gap-1">
                    {item.significance.map((sig, sigIndex) => (
                      <Badge key={sigIndex} variant="outline" className="text-xs">
                        {sig}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="bg-gradient-to-r from-accent/5 to-primary/5 border-accent/20">
        <CardHeader>
          <CardTitle className="font-playfair text-xl text-center">La Transubstanciación</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed text-pretty text-center">
            En el momento de la consagración, por las palabras del sacerdote y la acción del Espíritu Santo, la
            sustancia del pan y del vino se convierte verdaderamente en el Cuerpo y la Sangre de Cristo, aunque las
            apariencias (accidentes) permanezcan inalteradas. Este es el misterio central de la fe católica.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
