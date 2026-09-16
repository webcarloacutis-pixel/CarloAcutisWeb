"use client"
import { useState, useTransition } from "react"
import { useHydrated } from "@/lib/use-hydrated"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Heart, Lightbulb } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { scriptureData } from "@/lib/scripture-data"
import { filterScripture, normalizeText, queryValue } from "@/lib/content-filters"

const emotionKeywords = [...new Set(scriptureData.flatMap((verse) => verse.emotions))].sort((a, b) => a.localeCompare(b, "es"))
function SearchForm({ query, category, execute, pending }: { query: string; category: string; execute: (query: string, category: string) => void; pending: boolean }) {
  const hydrated = useHydrated()
  const [draft, setDraft] = useState(query)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestions = draft.trim().length > 1 ? emotionKeywords.filter((emotion) => normalizeText(emotion).includes(normalizeText(draft))).slice(0, 6) : []
  return <Card className="max-w-3xl mx-auto">
    <CardHeader><CardTitle className="text-center font-playfair flex items-center justify-center gap-2"><Heart className="h-6 w-6 text-primary" aria-hidden="true" />Busca Versículos por Sentimiento</CardTitle></CardHeader>
    <CardContent>
      <form onSubmit={(event) => { event.preventDefault(); setShowSuggestions(false); execute(draft, category) }} className="space-y-4">
        <div className="relative">
          <label className="block space-y-2"><span className="text-sm">Sentimiento, palabra o referencia bíblica</span>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" aria-hidden="true" />
              <Input disabled={!hydrated} type="search" aria-label="Sentimiento, palabra o referencia bíblica" placeholder="Miedo, tristeza, esperanza…" value={draft} maxLength={200}
                onChange={(event) => { setDraft(event.target.value); setShowSuggestions(true) }} className="pl-10 text-lg py-6"
                onFocus={() => setShowSuggestions(true)} onKeyDown={(event) => { if (event.key === "Escape") setShowSuggestions(false) }} />
            </div>
          </label>
          {showSuggestions && suggestions.length > 0 && <ul aria-label="Sugerencias de sentimientos" className="bg-card border border-border rounded-md mt-2 shadow-sm">
            {suggestions.map((suggestion) => <li key={suggestion}><button type="button" className="w-full text-left px-4 py-3 hover:bg-muted focus-visible:outline focus-visible:outline-2" onClick={() => { setShowSuggestions(false); execute(suggestion, category) }}>{suggestion} · {filterScripture(scriptureData, suggestion, category).length} versículos</button></li>)}
          </ul>}
        </div>
        <div className="flex flex-wrap gap-3"><Button type="submit" className="flex-1" size="lg" disabled={!hydrated || pending}>Buscar Versículos</Button><Button disabled={!hydrated} type="button" variant="outline" size="lg" onClick={() => { setDraft(""); setShowSuggestions(false); execute("", "") }}>Limpiar</Button></div>
      </form>
      <div className="mt-6"><p className="text-sm text-muted-foreground mb-3 flex items-center gap-2"><Lightbulb className="h-4 w-4" aria-hidden="true" />Ideas para buscar:</p>
        <div className="flex flex-wrap gap-2">{["miedo", "ansiedad", "esperanza", "paz", "fortaleza", "amor"].map((emotion) => <Button disabled={!hydrated} key={emotion} type="button" size="sm" variant="outline" onClick={() => execute(emotion, "")}>{emotion}</Button>)}</div>
      </div>
    </CardContent>
  </Card>
}
export function ScriptureSearchAdvanced() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const params = useSearchParams()
  const values = new URLSearchParams(params.toString())
  const query = queryValue(values, "busqueda", "q", "query").trim(), category = queryValue(values, "categoria", "category").trim()
  const searched = Boolean(query || category)
  const results = searched ? filterScripture(scriptureData, query, category) : []
  function execute(term: string, selectedCategory: string) {
    const next = new URLSearchParams()
    if (term.trim()) next.set("busqueda", term.trim().slice(0, 200))
    if (selectedCategory) next.set("categoria", selectedCategory)
    startTransition(() => router.push("/versiculos" + (next.size ? "?" + next : ""), { scroll: false }))
  }
  return <div className="space-y-8" aria-busy={pending}>
    <SearchForm key={query + "|" + category} query={query} category={category} execute={execute} pending={pending} />
    {searched && <section id="resultados" className="space-y-6 scroll-mt-24" aria-label="Resultados de versículos">
      <div className="text-center"><h2 className="font-playfair text-2xl font-semibold text-foreground mb-2">{query ? "Versículos para «" + query + "»" : "Versículos de la categoría seleccionada"}</h2>
        {category && <p className="text-muted-foreground">Categoría: {category.replace(/-/g, " ")}</p>}
        <p role="status" aria-live="polite" className="text-muted-foreground">{results.length} versículos encontrados</p></div>
      {results.length === 0 && <Card className="max-w-2xl mx-auto"><CardContent className="p-8 text-center"><p>No encontramos versículos con estos filtros. Puedes cambiar la búsqueda o limpiar la selección.</p></CardContent></Card>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{results.map((verse) => <Card key={verse.id} className="hover:shadow-lg transition-shadow"><CardContent className="p-6">
        <blockquote className="text-lg text-foreground mb-4 leading-relaxed italic text-pretty">{verse.text}</blockquote><cite className="text-primary font-medium">— {verse.reference}</cite><Separator className="my-4" />
        <div className="space-y-3"><div><p className="text-sm font-medium text-foreground mb-2">Emociones relacionadas:</p><div className="flex flex-wrap gap-1">{verse.emotions.map((emotion) => <Badge key={emotion} variant="secondary">{emotion}</Badge>)}</div></div>
          {verse.reflection && <div><p className="text-sm font-medium text-foreground mb-2">Reflexión:</p><p className="text-sm text-muted-foreground">{verse.reflection}</p></div>}
          {verse.prayer && <div><p className="text-sm font-medium text-foreground mb-2">Oración sugerida:</p><p className="text-sm text-muted-foreground italic whitespace-pre-wrap break-words">{verse.prayer}</p></div>}
        </div>
      </CardContent></Card>)}</div>
    </section>}
  </div>
}
