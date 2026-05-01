import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Heart, BookOpen } from "lucide-react"

export function SaintMatcherIntroduction() {
  return (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-gradient-to-br from-amber-100 to-red-100 rounded-full">
          <Sparkles className="h-8 w-8 text-amber-600" />
        </div>
      </div>

      <h1 className="font-playfair text-4xl font-bold text-gray-900 mb-4">Descubre Qué Santo Se Parece a Ti</h1>

      <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
        Comparte tus cualidades, desafíos y forma de ser. Nuestra inteligencia artificial analizará tu personalidad y te
        conectará con santos que compartieron características similares.
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-6 text-center">
            <Heart className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Describe tu Corazón</h3>
            <p className="text-sm text-gray-600">Comparte tus virtudes, pasiones y lo que más valoras en la vida</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6 text-center">
            <BookOpen className="h-8 w-8 text-blue-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Reconoce tus Desafíos</h3>
            <p className="text-sm text-gray-600">Identifica áreas donde buscas crecimiento y superación personal</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6 text-center">
            <Sparkles className="h-8 w-8 text-purple-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Encuentra tu Guía</h3>
            <p className="text-sm text-gray-600">Conecta con santos que vivieron experiencias similares a las tuyas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
