"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles } from "lucide-react"
import { SaintMatcherResults, type DiscoverSaintResult } from "@/components/saint-matcher-results"

const API = ('').replace(/\/$/, "")

const personalityTraits = [
  "Compasivo","Determinado","Humilde","Valiente","Paciente","Generoso","Contemplativo","Activo",
  "Estudioso","Servicial","LÃ­der","Obediente","Creativo","Disciplinado","Alegre","Serio",
  "Sociable","Reservado","Aventurero","Prudente","Optimista","Realista","Intuitivo","AnalÃ­tico",
]

const challenges = [
  "Impaciencia","Orgullo","Miedo","Ira","Pereza","Envidia","Dudas de fe","Ansiedad","Perfeccionismo",
  "ProcrastinaciÃ³n","CrÃ­tica excesiva","Pesimismo","Terquedad","Impulsividad","DesorganizaciÃ³n",
  "Timidez","Materialismo","Vanidad",
]

export function SaintMatcherForm() {
  const [description, setDescription] = useState("")
  const [selectedTraits, setSelectedTraits] = useState<string[]>([])
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const [result, setResult] = useState<DiscoverSaintResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)

  const toggleTrait = (trait: string) => {
    setSelectedTraits((prev) => (prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]))
  }

  const toggleChallenge = (challenge: string) => {
    setSelectedChallenges((prev) => (prev.includes(challenge) ? prev.filter((c) => c !== challenge) : [...prev, challenge]))
  }

  const canAnalyze = description.trim().length > 20 || selectedTraits.length > 0 || selectedChallenges.length > 0

  const analyzePersonality = async () => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const r = await fetch(`${API}/discover-saint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          about: description,
          qualities: selectedTraits,
          growthAreas: selectedChallenges,
        }),
      })

      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`)

      setResult(data as DiscoverSaintResult)
      setShowResults(true)
    } catch (e: any) {
      setResult(null)
      setShowResults(false)
      setError(e?.message || "Error")
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (showResults && result) {
    return (
      <SaintMatcherResults
        result={result}
        onReset={() => {
          setShowResults(false)
          setResult(null)
          setError(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="font-playfair text-xl text-gray-900">CuÃ©ntanos sobre ti</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe tu personalidad, valores y experiencias de vida
            </label>
            <Textarea
              placeholder="Ejemplo: Soy una persona que valora mucho la familia y la justicia..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">MÃ­nimo 20 caracteres para un anÃ¡lisis mÃ¡s preciso</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Selecciona tus principales cualidades</label>
            <div className="flex flex-wrap gap-2">
              {personalityTraits.map((trait) => (
                <Badge
                  key={trait}
                  variant={selectedTraits.includes(trait) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    selectedTraits.includes(trait)
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "hover:bg-amber-50 hover:border-amber-300"
                  }`}
                  onClick={() => toggleTrait(trait)}
                >
                  {trait}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Ãreas donde buscas crecimiento</label>
            <div className="flex flex-wrap gap-2">
              {challenges.map((challenge) => (
                <Badge
                  key={challenge}
                  variant={selectedChallenges.includes(challenge) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    selectedChallenges.includes(challenge)
                      ? "bg-red-600 hover:bg-red-700"
                      : "hover:bg-red-50 hover:border-red-300"
                  }`}
                  onClick={() => toggleChallenge(challenge)}
                >
                  {challenge}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            onClick={analyzePersonality}
            disabled={!canAnalyze || isAnalyzing}
            className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analizando tu personalidad...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Descubrir mis santos afines
              </>
            )}
          </Button>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </CardContent>
      </Card>
    </div>
  )
}

