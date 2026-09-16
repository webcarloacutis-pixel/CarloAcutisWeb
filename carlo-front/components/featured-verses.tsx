import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"
import { scriptureData } from "@/lib/scripture-data"
import { PopularityEstimate } from "@/components/popularity-estimate"
import type { PopularityEstimateData } from "@/lib/popularity-display"
const featuredVerses = scriptureData.filter((verse) => ["1", "2", "3", "4"].includes(verse.id))
export function FeaturedVerses({ estimates = {} }: { estimates?: Record<string, PopularityEstimateData> }) {
  return <div className="space-y-8">
    <div className="text-center"><h2 className="font-playfair text-3xl font-bold text-foreground mb-4 flex items-center justify-center gap-2"><Star className="h-8 w-8 text-primary" aria-hidden="true" />Versículos destacados</h2><p className="text-muted-foreground">Una selección de las Escrituras para la reflexión</p></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {featuredVerses.map((verse) => <Card key={verse.id} className="hover:shadow-lg transition-shadow"><CardContent className="p-6">
        <div className="space-y-3 mb-4"><Badge variant="secondary">{verse.emotions[0]}</Badge><PopularityEstimate estimate={estimates[verse.id]} /></div>
        <blockquote className="text-lg text-foreground mb-4 leading-relaxed italic text-pretty">{verse.text}</blockquote>
        <cite className="text-primary font-medium">— {verse.reference}</cite>
      </CardContent></Card>)}
    </div>
  </div>
}
