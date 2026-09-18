"use client"
import { useEffect, useState } from "react"
import { apiUrl } from "./api-url"
import { fetchPublicCollection } from "./public-collection"

export type SaintName = { id: string; name: string; slug: string }
let cached: { items: SaintName[]; expires: number } | undefined
/** Selector metadata only: never downloads biographies or editorial objects. */
export function useSaintNames() {
  const [state, setState] = useState<{ items: SaintName[]; loading: boolean; error: string | null }>(() =>
    cached && cached.expires > Date.now() ? { items: cached.items, loading: false, error: null } : { items: [], loading: true, error: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    if (cached && cached.expires > Date.now()) return
    void fetchPublicCollection<SaintName>(apiUrl("/saints?view=names"), { cache: "no-store", signal: controller.signal })
      .then(items => {
        if (controller.signal.aborted) return
        cached = { items, expires: Date.now() + 30_000 }
        setState({ items, loading: false, error: null })
      })
      .catch(() => { if (!controller.signal.aborted) setState({ items: [], loading: false, error: "No se pudo cargar el selector de santos." }) })
    return () => controller.abort()
  }, [attempt])
  useEffect(() => {
    function refresh() { cached = undefined; setAttempt(value => value + 1) }
    window.addEventListener("catalog:saints-changed", refresh)
    return () => window.removeEventListener("catalog:saints-changed", refresh)
  }, [])
  return { ...state, retry: () => { cached = undefined; setState({ items: [], loading: true, error: null }); setAttempt(value => value + 1) } }
}
