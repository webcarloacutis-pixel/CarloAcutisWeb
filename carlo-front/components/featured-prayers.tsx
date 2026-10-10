"use client"
import { useLanguage } from "@/contexts/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"
import { PopularityEstimate } from "@/components/popularity-estimate"
import type { PopularityEstimateData } from "@/lib/popularity-display"
import type { PublicPrayer } from "@/lib/content-filters"
type Props = { prayers: (PublicPrayer & { popularityEstimate?: PopularityEstimateData | null })[] }
export function FeaturedPrayers({ prayers }: Props) {
  const { t } = useLanguage()
  return <div className="space-y-8">
    <div className="text-center">
      <h2 className="font-playfair text-3xl font-bold text-foreground mb-4 flex items-center justify-center gap-2"><Star className="h-8 w-8 text-primary" aria-hidden="true" />{t("supplemental.featuredPrayers")}</h2>
      <p className="text-muted-foreground">{t("supplemental.recentPrayers")}</p>
    </div>
    {!prayers.length && <p className="text-center text-muted-foreground">{t("supplemental.featuredEmpty")}</p>}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {prayers.map((prayer) => <Card key={prayer.id} className="hover:shadow-lg transition-shadow min-w-0">
        <CardHeader>
          <CardTitle className="font-playfair text-lg mb-2 break-words">{prayer.title}</CardTitle>
          <div className="flex flex-wrap gap-2">{prayer.saintName && <Badge variant="secondary">{prayer.saintName}</Badge>}{prayer.occasion && <Badge variant="outline">{prayer.occasion}</Badge>}</div>
          <PopularityEstimate estimate={prayer.popularityEstimate} />
        </CardHeader>
        <CardContent><blockquote className="text-muted-foreground italic leading-relaxed whitespace-pre-wrap break-words">{prayer.content}</blockquote></CardContent>
      </Card>)}
    </div>
    <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader><CardTitle className="font-playfair text-xl text-center">{t("supplemental.prayWithSaints")}</CardTitle></CardHeader>
      <CardContent><div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div><h3 className="font-medium mb-2">{t("supplemental.preparation")}</h3><p className="text-sm text-muted-foreground">{t("supplemental.prepareTip")}</p></div>
        <div><h3 className="font-medium mb-2">{t("supplemental.praying")}</h3><p className="text-sm text-muted-foreground">{t("supplemental.prayTip")}</p></div>
        <div><h3 className="font-medium mb-2">{t("supplemental.reflection")}</h3><p className="text-sm text-muted-foreground">{t("supplemental.reflectTip")}</p></div>
      </div></CardContent>
    </Card>
  </div>
}
