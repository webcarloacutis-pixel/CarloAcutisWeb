"use client"

import { T } from "@/components/t";
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, MapPin, Heart, BookOpen, Sparkles, Church, UserSearch } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export function FeaturedSections() {
  const { t } = useLanguage()

  const sections = [
    {
      titleKey: "featured.saintsLife.title",
      descriptionKey: "featured.saintsLife.description",
      icon: Users,
      href: "/santos",
      color: "text-primary",
    },
    {
      titleKey: "featured.saintsMap.title",
      descriptionKey: "featured.saintsMap.description",
      icon: MapPin,
      href: "/mapa",
      color: "text-secondary",
    },
    {
      titleKey: "featured.discoverSaint.title",
      descriptionKey: "featured.discoverSaint.description",
      icon: UserSearch,
      href: "/descubre-tu-santo",
      color: "text-purple-600",
      featured: true,
    },
    {
      titleKey: "featured.miracles.title",
      descriptionKey: "featured.miracles.description",
      icon: Sparkles,
      href: "/milagros",
      color: "text-accent",
    },
    {
      titleKey: "featured.eucharist.title",
      descriptionKey: "featured.eucharist.description",
      icon: Church,
      href: "/eucaristia",
      color: "text-primary",
    },
    {
      titleKey: "featured.symbols.title",
      descriptionKey: "featured.symbols.description",
      icon: BookOpen,
      href: "/simbolos",
      color: "text-secondary",
    },
    {
      titleKey: "featured.prayers.title",
      descriptionKey: "featured.prayers.description",
      icon: Heart,
      href: "/oraciones",
      color: "text-accent",
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-foreground mb-4"><T k="featured.title" /></h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
  <T k="featured.subtitle" />
</p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sections.map((section, index) => {
            const IconComponent = section.icon
            return (
              <Card
                key={index}
                className={`group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20 ${
                  section.featured ? "ring-2 ring-purple-200 bg-gradient-to-br from-purple-50 to-white" : ""
                }`}
              >
                <CardHeader className="text-center pb-4">
                  <div
                    className={`mx-auto mb-4 p-3 rounded-full transition-colors ${
                      section.featured
                        ? "bg-gradient-to-br from-purple-100 to-purple-200 group-hover:from-purple-200 group-hover:to-purple-300"
                        : "bg-muted group-hover:bg-primary/10"
                    }`}
                  >
                    <IconComponent className={`h-8 w-8 ${section.color}`} />
                  </div>
                  <CardTitle className="font-playfair text-xl">{t(section.titleKey)}</CardTitle>
                  {section.featured && (
                    <div className="inline-block px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-medium"><T k="featured.new" /></div>
                  )}
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground mb-6 text-pretty">{t(section.descriptionKey)}</p>
                  <Button
                    asChild
                    variant={section.featured ? "default" : "outline"}
                    className={`w-full ${section.featured ? "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800" : "bg-transparent"}`}
                  >
                    <Link href={section.href}>
                      {section.featured ? t("featured.discoverNow") : t("featured.explore")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
