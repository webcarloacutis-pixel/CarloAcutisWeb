"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { badgeVariants } from "@/components/ui/badge"
import { Loader2, Sparkles } from "lucide-react"
import { SaintMatcherResults, type DiscoverSaintResult } from "@/components/saint-matcher-results"
import { useLanguage } from "@/contexts/language-context"
import { apiUrl } from "@/lib/api-url"
import { chatErrorKey } from "@/lib/ai-client"

const personalityTraits = [
  "Compasivo","Determinado","Humilde","Valiente","Paciente","Generoso","Contemplativo","Activo",
  "Estudioso","Servicial","Líder","Obediente","Creativo","Disciplinado","Alegre","Serio",
  "Sociable","Reservado","Aventurero","Prudente","Optimista","Realista","Intuitivo","Analítico",
]

const challenges = [
  "Impaciencia","Orgullo","Miedo","Ira","Pereza","Envidia","Dudas de fe","Ansiedad","Perfeccionismo",
  "Procrastinación","Crítica excesiva","Pesimismo","Terquedad","Impulsividad","DesorganizaciÃ³n",
  "Timidez","Materialismo","Vanidad",
]

function isDiscoverSaintResult(value: unknown): value is DiscoverSaintResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const result = value as Record<string, unknown>
  if (typeof result.summary !== 'string' || !Array.isArray(result.matches)) return false
  return result.matches.every((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const match = value as Record<string, unknown>
    return typeof match.slug === 'string' && Boolean(match.slug.trim())
      && typeof match.name === 'string' && Boolean(match.name.trim())
      && (match.id === undefined || typeof match.id === 'string')
      && (match.score === undefined || typeof match.score === 'number' && Number.isFinite(match.score))
  }) && (result.termsUsed === undefined || Array.isArray(result.termsUsed) && result.termsUsed.every(term => typeof term === 'string'))
}

export function SaintMatcherForm() {
  const { t } = useLanguage()
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
      const r = await fetch(apiUrl('/discover-saint'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: 'no-store',
        signal: AbortSignal.timeout(35_000),
        body: JSON.stringify({
          about: description,
          qualities: selectedTraits,
          growthAreas: selectedChallenges,
        }),
      })

      const data: unknown = await r.json().catch(() => null)
      if (!r.ok) {
        const code = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : undefined
        const providerCodes = new Set(['AI_DISABLED','AI_CONFIGURATION_MISSING','AI_PROVIDER_AUTH','AI_MODEL_UNAVAILABLE','AI_QUOTA_EXCEEDED','AI_TIMEOUT','AI_RESPONSE_INVALID','AI_PERSISTENCE_FAILED'])
        const key = r.status === 429 ? 'catalog.rateLimited' : r.status === 401 || r.status === 403 ? 'catalog.accessDenied'
          : code && providerCodes.has(code) ? chatErrorKey({ code, status: r.status })
          : r.status >= 500 ? 'catalog.temporarilyUnavailable' : 'catalog.failed'
        throw new Error(key)
      }

      if (!isDiscoverSaintResult(data)) throw new Error('chat.invalid')
      setResult(data)
      setShowResults(true)
    } catch (e: unknown) {
      setResult(null)
      setShowResults(false)
      setError(e instanceof Error && /^(catalog|chat)\./.test(e.message) ? e.message : 'catalog.temporarilyUnavailable')
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
          <CardTitle className="font-playfair text-xl text-gray-900">{t('supplemental.aboutYou')}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <label htmlFor="affinity-description" className="block text-sm font-medium text-gray-700 mb-2">
              {t('supplemental.personalityPrompt')}
            </label>
            <Textarea
              id="affinity-description"
              placeholder={t('supplemental.personalityPrompt')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{t('supplemental.personalityHint')}</p>
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-700 mb-3">{t('supplemental.qualitiesTitle')}</p>
            <div className="flex flex-wrap gap-2">
              {personalityTraits.map((trait, index) => (
                <button
                  key={trait}
                  type="button"
                  aria-pressed={selectedTraits.includes(trait)}
                  className={`${badgeVariants({variant: selectedTraits.includes(trait) ? "default" : "outline"})} min-h-11 cursor-pointer transition-colors ${
                    selectedTraits.includes(trait)
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "hover:bg-amber-50 hover:border-amber-300"
                  }`}
                  onClick={() => toggleTrait(trait)}
                >
                  {t('supplemental.trait' + index)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-700 mb-3">{t('supplemental.growthTitle')}</p>
            <div className="flex flex-wrap gap-2">
              {challenges.map((challenge, index) => (
                <button
                  key={challenge}
                  type="button"
                  aria-pressed={selectedChallenges.includes(challenge)}
                  className={`${badgeVariants({variant: selectedChallenges.includes(challenge) ? "default" : "outline"})} min-h-11 cursor-pointer transition-colors ${
                    selectedChallenges.includes(challenge)
                      ? "bg-red-600 hover:bg-red-700"
                      : "hover:bg-red-50 hover:border-red-300"
                  }`}
                  onClick={() => toggleChallenge(challenge)}
                >
                  {t('supplemental.challenge' + index)}
                </button>
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
                {t('supplemental.analyzing')}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('supplemental.discover')}
              </>
            )}
          </Button>

          {error && <div role="alert" className="text-sm text-red-600">{t(error)}</div>}
        </CardContent>
      </Card>
    </div>
  )
}
