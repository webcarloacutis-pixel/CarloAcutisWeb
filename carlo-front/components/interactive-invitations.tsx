"use client"

import { T } from "@/components/t";
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, MapPin, Heart, BookOpen, Users, Star, ArrowRight, Compass, Search } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/contexts/language-context"

export function InteractiveInvitations() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const { t } = useLanguage()

  const invitations = [
    {
      id: "discover-saint",
      titleKey: "invitations.saintMatch.title",
      descriptionKey: "invitations.saintMatch.description",
      icon: Sparkles,
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-gradient-to-br from-purple-50 to-pink-50",
      textColor: "text-purple-700",
      href: "/descubre-tu-santo",
      statsKey: "invitations.saintMatch.stats",
      actionKey: "invitations.saintMatch.action",
      previewKey: "invitations.saintMatch.preview",
    },
    {
      id: "explore-map",
      titleKey: "invitations.worldMap.title",
      descriptionKey: "invitations.worldMap.description",
      icon: MapPin,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-gradient-to-br from-blue-50 to-cyan-50",
      textColor: "text-blue-700",
      href: "/mapa",
      statsKey: "invitations.worldMap.stats",
      actionKey: "invitations.worldMap.action",
      previewKey: "invitations.worldMap.preview",
    },
    {
      id: "emotional-verses",
      titleKey: "invitations.emotionalVerses.title",
      descriptionKey: "invitations.emotionalVerses.description",
      icon: Heart,
      color: "from-rose-500 to-orange-500",
      bgColor: "bg-gradient-to-br from-rose-50 to-orange-50",
      textColor: "text-rose-700",
      href: "/versiculos",
      statsKey: "invitations.emotionalVerses.stats",
      actionKey: "invitations.emotionalVerses.action",
      previewKey: "invitations.emotionalVerses.preview",
    },
    {
      id: "daily-inspiration",
      titleKey: "invitations.dailyInspiration.title",
      descriptionKey: "invitations.dailyInspiration.description",
      icon: BookOpen,
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-gradient-to-br from-emerald-50 to-teal-50",
      textColor: "text-emerald-700",
      href: "/oraciones",
      statsKey: "invitations.dailyInspiration.stats",
      actionKey: "invitations.dailyInspiration.action",
      previewKey: "invitations.dailyInspiration.preview",
    },
  ]

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Compass className="h-4 w-4" /><T k="invitations.exploreDiscover" /></div>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-foreground mb-4"><T k="invitations.title" /></h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty"><T k="invitations.subtitle" /></p>
        </div>

        {/* Interactive Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {invitations.map((invitation) => {
            const Icon = invitation.icon
            const isHovered = hoveredCard === invitation.id

            return (
              <Card
                key={invitation.id}
                className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 hover:border-primary/20 ${invitation.bgColor}`}
                onMouseEnter={() => setHoveredCard(invitation.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl bg-gradient-to-br ${invitation.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`font-playfair text-xl font-semibold ${invitation.textColor}`}>
                          {t(invitation.titleKey)}
                        </h3>
                        {isHovered && <ArrowRight className="h-4 w-4 text-primary animate-pulse" />}
                      </div>

                      <p className="text-muted-foreground mb-3 text-pretty">{t(invitation.descriptionKey)}</p>

                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          {t(invitation.statsKey)}
                        </Badge>
                      </div>

                      {isHovered && (
                        <div className="mb-4 p-3 bg-white/60 rounded-lg border border-white/40 animate-in slide-in-from-top-2 duration-300">
                          <p className="text-sm text-muted-foreground">{t(invitation.previewKey)}</p>
                        </div>
                      )}

                      <Link href={invitation.href}>
                        <Button
                          className={`w-full group-hover:shadow-lg transition-all duration-300 ${
                            isHovered ? "bg-primary hover:bg-primary/90" : ""
                          }`}
                          variant={isHovered ? "default" : "outline"}
                        >
                          {t(invitation.actionKey)}
                          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-card border rounded-xl p-6 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h3 className="font-playfair text-xl font-semibold text-foreground mb-2"><T k="invitations.notSure.title" /></h3>
              <p className="text-muted-foreground"><T k="invitations.notSure.description" /></p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/descubre-tu-santo">
                <Button size="lg" className="w-full sm:w-auto">
                  <Search className="h-4 w-4 mr-2" /><T k="invitations.discoverSaint" /></Button>
              </Link>
              <Link href="/mapa">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent">
                  <MapPin className="h-4 w-4 mr-2" /><T k="invitations.exploreMap" /></Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          {[
            { numberKey: "1,000+", labelKey: "invitations.stats.saints", icon: Users },
            { numberKey: "195+", labelKey: "invitations.stats.countries", icon: MapPin },
            { numberKey: "50+", labelKey: "invitations.stats.emotions", icon: Heart },
            { numberKey: "365", labelKey: "invitations.stats.inspiration", icon: BookOpen },
          ].map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="text-center p-4 bg-card/50 rounded-lg border">
                <Icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="font-playfair text-2xl font-bold text-foreground">{stat.numberKey}</div>
                <div className="text-sm text-muted-foreground">{t(stat.labelKey)}</div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
