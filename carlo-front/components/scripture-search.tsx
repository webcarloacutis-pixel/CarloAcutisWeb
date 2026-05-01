"use client"

import { T } from "@/components/t";
import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useLanguage } from "@/contexts/language-context"

export function ScriptureSearch() {
  const [searchTerm, setSearchTerm] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const { t } = useLanguage()

  const sentimentSuggestions = [
    t("scriptureSearch.suggestions.fear"),
    t("scriptureSearch.suggestions.anxiety"),
    t("scriptureSearch.suggestions.sadness"),
    t("scriptureSearch.suggestions.joy"),
    t("scriptureSearch.suggestions.hope"),
    t("scriptureSearch.suggestions.gratitude"),
    t("scriptureSearch.suggestions.forgiveness"),
    t("scriptureSearch.suggestions.love"),
    t("scriptureSearch.suggestions.peace"),
    t("scriptureSearch.suggestions.strength"),
  ]

  const handleInputChange = (value: string) => {
    setSearchTerm(value)

    if (value.length > 0) {
      const filtered = sentimentSuggestions.filter((sentiment) => sentiment.toLowerCase().includes(value.toLowerCase()))
      setSuggestions(filtered.slice(0, 5))
    } else {
      setSuggestions([])
    }
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-foreground mb-4"><T k="scriptureSearch.title" /></h2>
          <p className="text-lg text-muted-foreground"><T k="scriptureSearch.subtitle" /></p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center font-playfair"><T k="scriptureSearch.cardTitle" /></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  type="text"
                  placeholder={t("scriptureSearch.placeholder")}
                  value={searchTerm}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="pl-10 text-lg py-6"
                />
              </div>

              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md mt-1 shadow-lg z-10">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-4 py-2 hover:bg-muted transition-colors text-muted-foreground"
                      onClick={() => {
                        setSearchTerm(suggestion)
                        setSuggestions([])
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button asChild className="w-full mt-4" size="lg">
              <Link href={`/versiculos?busqueda=${encodeURIComponent(searchTerm)}`}><T k="scriptureSearch.searchButton" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
