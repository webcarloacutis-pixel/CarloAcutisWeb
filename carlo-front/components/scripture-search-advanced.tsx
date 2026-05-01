"use client"

import type React from "react"

import { useState } from "react"
import { Search, Heart, Lightbulb } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { scriptureData, type ScriptureVerse } from "@/lib/scripture-data"

export function ScriptureSearchAdvanced() {
  const [searchTerm, setSearchTerm] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [results, setResults] = useState<ScriptureVerse[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Palabras clave para sentimientos
  const emotionKeywords = [
    "miedo",
    "ansiedad",
    "tristeza",
    "depresión",
    "soledad",
    "alegría",
    "felicidad",
    "esperanza",
    "gratitud",
    "amor",
    "paz",
    "tranquilidad",
    "fortaleza",
    "valor",
    "perdón",
    "culpa",
    "arrepentimiento",
    "duda",
    "fe",
    "confianza",
    "preocupación",
    "estrés",
    "dolor",
    "sufrimiento",
    "enfermedad",
    "muerte",
    "duelo",
    "ira",
    "enojo",
    "frustración",
    "paciencia",
    "humildad",
    "orgullo",
    "tentación",
    "pecado",
    "salvación",
    "redención",
  ]

  // Manejar cambios en el input con autocompletado
  const handleInputChange = (value: string) => {
    setSearchTerm(value)

    if (value.length > 1) {
      const filtered = emotionKeywords.filter((emotion) => emotion.toLowerCase().includes(value.toLowerCase()))
      setSuggestions(filtered.slice(0, 6))
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Buscar versículos
  const searchVerses = (term: string) => {
    if (!term.trim()) return

    setIsSearching(true)
    setShowSuggestions(false)

    // Simular búsqueda (en una app real, esto sería una llamada a API)
    setTimeout(() => {
      const matchingVerses = scriptureData.filter(
        (verse) =>
          verse.emotions.some((emotion) => emotion.toLowerCase().includes(term.toLowerCase())) ||
          verse.keywords.some((keyword) => keyword.toLowerCase().includes(term.toLowerCase())) ||
          verse.text.toLowerCase().includes(term.toLowerCase()),
      )

      setResults(matchingVerses.slice(0, 10)) // Limitar a 10 resultados
      setIsSearching(false)
    }, 800)
  }

  // Manejar envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    searchVerses(searchTerm)
  }

  // Seleccionar sugerencia
  const selectSuggestion = (suggestion: string) => {
    setSearchTerm(suggestion)
    setShowSuggestions(false)
    searchVerses(suggestion)
  }

  return (
    <div className="space-y-8">
      {/* Buscador principal */}
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center font-playfair flex items-center justify-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            Busca Versículos por Sentimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Describe cómo te sientes... (ej: miedo, tristeza, esperanza)"
                  value={searchTerm}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="pl-10 text-lg py-6"
                  onFocus={() => searchTerm.length > 1 && setShowSuggestions(true)}
                />
              </div>

              {/* Sugerencias de autocompletado */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md mt-1 shadow-lg z-10">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors text-muted-foreground border-b border-border last:border-b-0"
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      <span className="font-medium text-foreground">{suggestion}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        - {scriptureData.filter((v) => v.emotions.includes(suggestion)).length} versículos
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSearching}>
              {isSearching ? "Buscando..." : "Buscar Versículos"}
            </Button>
          </form>

          {/* Sugerencias rápidas */}
          <div className="mt-6">
            <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Búsquedas populares:
            </p>
            <div className="flex flex-wrap gap-2">
              {["miedo", "ansiedad", "esperanza", "paz", "fortaleza", "amor"].map((emotion) => (
                <Badge
                  key={emotion}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => selectSuggestion(emotion)}
                >
                  {emotion}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados de búsqueda */}
      {results.length > 0 && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="font-playfair text-2xl font-semibold text-foreground mb-2">
              Versículos para "{searchTerm}"
            </h2>
            <p className="text-muted-foreground">Encontramos {results.length} versículos que pueden ayudarte</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((verse) => (
              <Card key={verse.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <blockquote className="text-lg text-foreground mb-4 leading-relaxed italic text-pretty">
                    "{verse.text}"
                  </blockquote>
                  <cite className="text-primary font-medium">— {verse.reference}</cite>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Emociones relacionadas:</p>
                      <div className="flex flex-wrap gap-1">
                        {verse.emotions.map((emotion, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {emotion}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {verse.reflection && (
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Reflexión:</p>
                        <p className="text-sm text-muted-foreground text-pretty">{verse.reflection}</p>
                      </div>
                    )}

                    {verse.prayer && (
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Oración sugerida:</p>
                        <p className="text-sm text-muted-foreground italic text-pretty">"{verse.prayer}"</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay resultados */}
      {results.length === 0 && searchTerm && !isSearching && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              No encontramos versículos específicos para "{searchTerm}". Intenta con palabras como:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {emotionKeywords.slice(0, 8).map((emotion) => (
                <Badge
                  key={emotion}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => selectSuggestion(emotion)}
                >
                  {emotion}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
