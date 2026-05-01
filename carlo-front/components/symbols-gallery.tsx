import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const symbolsData = [
  {
    name: "La Cruz",
    category: "Cristológico",
    meaning: "Sacrificio Redentor de Cristo",
    description:
      "La cruz es el símbolo más importante del cristianismo, representando el sacrificio de Jesús por la salvación de la humanidad. Es signo de amor, redención y victoria sobre la muerte.",
    variations: ["Cruz Latina", "Cruz Griega", "Crucifijo", "Cruz de San Andrés"],
    biblicalReference: "Gálatas 6:14",
    usage: "Liturgia, oración personal, bendiciones",
  },
  {
    name: "El Pez (IXTHYS)",
    category: "Cristológico",
    meaning: "Jesucristo, Hijo de Dios, Salvador",
    description:
      "El pez fue uno de los primeros símbolos cristianos. Las letras griegas IXTHYS forman un acróstico: Iesous Christos Theou Yios Soter (Jesucristo, Hijo de Dios, Salvador).",
    variations: ["Pez simple", "Dos peces", "Pez con pan"],
    biblicalReference: "Mateo 4:19",
    usage: "Identificación cristiana primitiva, arte sacro",
  },
  {
    name: "La Paloma",
    category: "Espíritu Santo",
    meaning: "Espíritu Santo, Paz Divina",
    description:
      "La paloma representa al Espíritu Santo, especialmente desde el bautismo de Jesús. También simboliza la paz, la pureza y el alma humana que busca a Dios.",
    variations: ["Paloma con rama de olivo", "Paloma descendente", "Paloma con aureola"],
    biblicalReference: "Mateo 3:16",
    usage: "Confirmación, Pentecostés, símbolos de paz",
  },
  {
    name: "El Cordero",
    category: "Cristológico",
    meaning: "Cristo como Cordero de Dios",
    description:
      "El cordero representa a Cristo como el Cordero de Dios que quita el pecado del mundo. Simboliza la inocencia, el sacrificio y la redención.",
    variations: ["Cordero con cruz", "Cordero con bandera", "Cordero sobre el libro"],
    biblicalReference: "Juan 1:29",
    usage: "Eucaristía, arte litúrgico, himnos",
  },
  {
    name: "El Corazón Sagrado",
    category: "Cristológico",
    meaning: "Amor infinito de Cristo",
    description:
      "El Sagrado Corazón de Jesús representa el amor divino e infinito de Cristo por la humanidad. Suele representarse rodeado de espinas y coronado con una cruz.",
    variations: ["Corazón con espinas", "Corazón flameante", "Corazón con cruz"],
    biblicalReference: "Juan 19:34",
    usage: "Devoción personal, mes de junio, consagración",
  },
  {
    name: "La Rosa Mística",
    category: "Mariano",
    meaning: "Pureza y belleza de María",
    description:
      "La rosa simboliza a la Virgen María, especialmente su pureza, belleza espiritual y su papel como Madre de Dios. Es llamada 'Rosa Mística' en las letanías.",
    variations: ["Rosa blanca", "Rosa roja", "Rosal", "Corona de rosas"],
    biblicalReference: "Cantar de los Cantares 2:1",
    usage: "Mes de mayo, rosario, advocaciones marianas",
  },
  {
    name: "El Ancla",
    category: "Virtudes",
    meaning: "Esperanza y Salvación",
    description:
      "El ancla simboliza la esperanza cristiana y la salvación. Representa la estabilidad de la fe y la seguridad que encontramos en Cristo durante las tormentas de la vida.",
    variations: ["Ancla con cruz", "Ancla con pez", "Ancla con cuerda"],
    biblicalReference: "Hebreos 6:19",
    usage: "Símbolos funerarios, arte cristiano primitivo",
  },
  {
    name: "La Vid",
    category: "Cristológico",
    meaning: "Cristo como fuente de vida",
    description:
      "La vid representa a Cristo como la fuente de vida espiritual. Los sarmientos somos nosotros, que necesitamos permanecer unidos a Él para dar fruto.",
    variations: ["Vid con racimos", "Sarmientos", "Hoja de parra"],
    biblicalReference: "Juan 15:5",
    usage: "Eucaristía, decoración de altares, catequesis",
  },
]

export function SymbolsGallery() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-playfair text-3xl font-bold text-foreground mb-4">Galería de Símbolos Sagrados</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Explora los símbolos más importantes de la tradición católica y descubre su profundo significado espiritual
        </p>
      </div>

      <div className="space-y-6">
        {symbolsData.map((symbol, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="font-playfair text-xl mb-2">{symbol.name}</CardTitle>
                  <Badge variant="secondary" className="mb-2">
                    {symbol.category}
                  </Badge>
                  <p className="text-primary font-medium">{symbol.meaning}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed text-pretty mb-4">{symbol.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2 text-sm">Variaciones:</h4>
                  <ul className="space-y-1">
                    {symbol.variations.map((variation, varIndex) => (
                      <li key={varIndex} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60"></div>
                        {variation}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2 text-sm">Referencia Bíblica:</h4>
                  <p className="text-sm text-primary">{symbol.biblicalReference}</p>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2 text-sm">Uso Litúrgico:</h4>
                  <p className="text-sm text-muted-foreground">{symbol.usage}</p>
                </div>
              </div>

              {index < symbolsData.length - 1 && <Separator className="mt-6" />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
