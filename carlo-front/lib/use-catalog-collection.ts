"use client"
import { useEffect, useState } from "react"
import { fetchPublicCollection } from "./public-collection"
import { catalogErrorKey } from './public-request'

export function useCatalogCollection<T extends { id: string }>(url: string) {
  const [state, setState] = useState<{ url: string; items: T[]; loading: boolean; error: string | null }>({ url: '', items: [], loading: true, error: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    fetchPublicCollection<T>(url, { cache: "no-store", credentials: "include", signal: controller.signal })
      .then(items => { if (active) setState({ url, items, loading: false, error: null }) })
      .catch(error => { if (active) setState({ url, items: [], loading: false, error: catalogErrorKey(error) }) })
    return () => { active = false; controller.abort() }
  }, [url, attempt])
  useEffect(() => {
    function refresh() { setState({ url, items: [], loading: true, error: null }); setAttempt(value => value + 1) }
    window.addEventListener("catalog:saints-changed", refresh)
    return () => window.removeEventListener("catalog:saints-changed", refresh)
  }, [url])
  return { items: state.url === url ? state.items : [], error: state.url === url ? state.error : null,
    loading: state.loading || state.url !== url,
    retry: () => { setState({ url, items: [], loading: true, error: null }); setAttempt(value => value + 1) } }
}
