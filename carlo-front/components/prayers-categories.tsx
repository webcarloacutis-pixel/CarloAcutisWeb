"use client"
import { useLanguage } from "@/contexts/language-context"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PRAYER_CATEGORIES, categoryKey, matchesPrayerCategory, type PublicPrayer } from "@/lib/content-filters"
import { formatTranslation } from "@/lib/format-translation"
export type DbPrayer = PublicPrayer
export function PrayersCategories({ prayers }: { prayers: PublicPrayer[] }) {
  const { t } = useLanguage()
  return <div className="space-y-6">
    <div className="text-center"><h2 className="font-playfair text-3xl font-bold text-foreground mb-2">{t("supplemental.prayerCategories")}</h2><p className="text-muted-foreground">{t("supplemental.categoriesHelp")}</p></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {PRAYER_CATEGORIES.map((category, index) => <Card key={category.title} className="hover:shadow-lg transition-shadow">
        <CardHeader><CardTitle className="text-xl">{t(`supplemental.prayerCategory.${index}.title`)}</CardTitle><p className="text-sm text-muted-foreground">{t(`supplemental.prayerCategory.${index}.description`)}</p></CardHeader>
        <CardContent className="space-y-4"><div className="flex flex-wrap gap-2">{category.tags.map((tag, tagIndex) => <Badge key={tag} variant="secondary">{t(`supplemental.prayerCategory.${index}.tag${tagIndex}`)}</Badge>)}</div>
          <p className="text-sm text-muted-foreground">{formatTranslation(t("supplemental.prayersAvailable"), { count: prayers.filter((prayer) => matchesPrayerCategory(prayer.category, category.title)).length })}</p>
          <Button asChild variant="outline" className="w-full"><Link prefetch={false} href={"/oraciones?" + new URLSearchParams({ categoria: categoryKey(category.title) }) + "#resultados"} aria-label={formatTranslation(t("supplemental.exploreCategory"), { name: t(`supplemental.prayerCategory.${index}.title`) })}>{t("supplemental.explorePrayers")}</Link></Button>
        </CardContent>
      </Card>)}
    </div>
  </div>
}
