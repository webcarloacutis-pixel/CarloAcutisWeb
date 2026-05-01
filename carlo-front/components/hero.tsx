"use client"

import { T } from "@/components/t";
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useLanguage } from "@/contexts/language-context"
import { Sparkles, ArrowRight } from "lucide-react"

export function Hero() {
  const { t } = useLanguage()

  return (
    <section className="relative py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className="max-w-5xl mx-auto text-center relative">
        <div className="mb-6">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-1"><T k="hero.dedication" /></p>
          <p className="text-xs text-muted-foreground font-light"><T k="hero.dedicationDates" /></p>
        </div>

        {/* Ornate divider */}
        <div className="ornate-divider w-24 mx-auto mb-8"></div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary"><T k="hero.aiPowered" /></span>
        </div>

        <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 text-balance leading-tight"><T k="hero.title" /></h1>

        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty leading-relaxed"><T k="hero.subtitle" /></p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="text-lg px-8 gap-2 group">
            <a href="#ai-chat">
              <Sparkles className="w-5 h-5" /><T k="hero.startChat" /><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-lg px-8 bg-transparent">
            <Link href="/descubre-tu-santo"><T k="hero.discoverSaint" /></Link>
          </Button>
        </div>

        {/* Ornate divider */}
        <div className="ornate-divider w-24 mx-auto mt-12"></div>
      </div>
    </section>
  )
}
