"use client"
import { scriptureData } from "@/lib/scripture-data"
import { categoryKey, filterScripture } from "@/lib/content-filters"
import { useLanguage } from "@/contexts/language-context"
import { formatTranslation } from "@/lib/format-translation"
import { scriptureEmotionTranslationKey } from "@/lib/supplemental-scripture-translations"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, Shield, Sun, Anchor, Move as Dove, Mountain } from "lucide-react"

const emotionalCategories = [
  {
    title: "Miedo y Ansiedad",
    icon: Shield,
    color: "text-secondary",
    emotions: ["miedo", "ansiedad", "preocupación", "estrés"],
  },
  {
    title: "Tristeza y Dolor",
    icon: Heart,
    color: "text-accent",
    emotions: ["tristeza", "dolor", "duelo", "soledad"],
  },
  {
    title: "Esperanza y Alegría",
    icon: Sun,
    color: "text-primary",
    emotions: ["esperanza", "alegría", "felicidad", "gratitud"],
  },
  {
    title: "Fe y Confianza",
    icon: Anchor,
    color: "text-secondary",
    emotions: ["fe", "confianza", "duda", "fortaleza"],
  },
  {
    title: "Paz y Tranquilidad",
    icon: Dove,
    color: "text-accent",
    emotions: ["paz", "tranquilidad", "calma", "serenidad"],
  },
  {
    title: "Fortaleza y Valor",
    icon: Mountain,
    color: "text-primary",
    emotions: ["fortaleza", "valor", "perseverancia", "resistencia"],
  },
]

export function EmotionalCategories() {
  const { t } = useLanguage()
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-playfair text-3xl font-bold text-foreground mb-4">{t("supplemental.scripture.categoriesTitle")}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t("supplemental.scripture.categoriesDescription")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {emotionalCategories.map((category, index) => {
          const IconComponent = category.icon
          return (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 ">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-3 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                  <IconComponent className={`h-8 w-8 ${category.color}`} />
                </div>
                <CardTitle className="font-playfair text-xl">{t(`supplemental.scripture.category.${index}.title`)}</CardTitle>
                <p className="text-sm text-muted-foreground">{t(`supplemental.scripture.category.${index}.description`)}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {category.emotions.map((emotion, emotionIndex) => (
                      <Badge key={emotionIndex} variant="outline" className="text-xs">
                        {scriptureEmotionTranslationKey(emotion) ? t(scriptureEmotionTranslationKey(emotion)!) : emotion}
                      </Badge>
                    ))}
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">{formatTranslation(t("supplemental.scripture.availableCount"), { count: filterScripture(scriptureData, "", category.title).length })}</p>
                    <Link prefetch={false}
                      href={"/versiculos?" + new URLSearchParams({ categoria: categoryKey(category.title) })}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full"
                    >
                      {t("supplemental.scripture.exploreVerses")}
                    </Link>
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
