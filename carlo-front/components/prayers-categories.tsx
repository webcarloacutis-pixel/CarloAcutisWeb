import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PRAYER_CATEGORIES, categoryKey, matchesPrayerCategory, type PublicPrayer } from "@/lib/content-filters"
export type DbPrayer = PublicPrayer
export function PrayersCategories({ prayers }: { prayers: PublicPrayer[] }) {
  return <div className="space-y-6">
    <div className="text-center"><h2 className="font-playfair text-3xl font-bold text-foreground mb-2">Categorías de Oraciones</h2><p className="text-muted-foreground">Explora oraciones organizadas por temas y necesidades espirituales</p></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {PRAYER_CATEGORIES.map((category) => <Card key={category.title} className="hover:shadow-lg transition-shadow">
        <CardHeader><CardTitle className="text-xl">{category.title}</CardTitle><p className="text-sm text-muted-foreground">{category.description}</p></CardHeader>
        <CardContent className="space-y-4"><div className="flex flex-wrap gap-2">{category.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>
          <p className="text-sm text-muted-foreground">{prayers.filter((prayer) => matchesPrayerCategory(prayer.category, category.title)).length} oraciones disponibles</p>
          <Button asChild variant="outline" className="w-full"><Link prefetch={false} href={"/oraciones?" + new URLSearchParams({ categoria: categoryKey(category.title) }) + "#resultados"} aria-label={"Explorar " + category.title}>Explorar Oraciones</Link></Button>
        </CardContent>
      </Card>)}
    </div>
  </div>
}
