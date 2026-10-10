import { T } from "@/components/t"
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

      <h1 className="font-playfair text-4xl font-bold text-gray-900 mb-4"><T k="supplemental.affinityTitle" /></h1>

      <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
        <T k="supplemental.affinityHelp" />
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-6 text-center">
            <Heart className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2"><T k="supplemental.affinityHeartTitle" /></h3>
            <p className="text-sm text-gray-600"><T k="supplemental.affinityHeartHelp" /></p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6 text-center">
            <BookOpen className="h-8 w-8 text-blue-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2"><T k="supplemental.affinityChallengesTitle" /></h3>
            <p className="text-sm text-gray-600"><T k="supplemental.affinityChallengesHelp" /></p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6 text-center">
            <Sparkles className="h-8 w-8 text-purple-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2"><T k="supplemental.affinityGuideTitle" /></h3>
            <p className="text-sm text-gray-600"><T k="supplemental.affinityGuideHelp" /></p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
