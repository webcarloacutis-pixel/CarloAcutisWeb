"use client"
import { useEffect, useState } from "react"
import { fetchPublicCollection } from "./public-collection"

export function useCatalogCollection<T extends { id: string }>(url: string) {
  const [state, setState] = useState<{ items: T[]; loading: boolean; error: string | null }>({ items: [], loading: true, error: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    fetchPublicCollection<T>(url, { cache: "no-store", credentials: "include", signal: controller.signal })
      .then(items => { if (active) setState({ items, loading: false, error: null }) })
      .catch(error => { if (active) setState({ items: [], loading: false, error: error instanceof Error ? error.message : "No se pudo cargar el catálogo completo." }) })
    return () => { active = false; controller.abort() }
  }, [url, attempt])
  useEffect(() => {
    function refresh() { setAttempt(value => value + 1) }
    window.addEventListener("catalog:saints-changed", refresh)
    return () => window.removeEventListener("catalog:saints-changed", refresh)
  }, [])
  return { ...state, retry: () => { setState({ items: [], loading: true, error: null }); setAttempt(value => value + 1) } }
}
