"use client"
import { useEffect, useRef, useState } from "react"
import { requestMiraclePage, type MiraclePage } from "./miracle-pages"

function resourcePath(url: string) { return new URL(url || "/", "http://catalog.invalid").pathname }
/** Per-mount cache with separate public/admin resources; the auth guard unmounts private views on logout. */
export function useMiraclePage(url: string) {
  const cache = useRef(new Map<string, { page: MiraclePage; expires: number }>())
  const [state, setState] = useState<{ url: string; page: MiraclePage | null; error: string | null }>({ url: "", page: null, error: null })
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    for (const key of cache.current.keys()) if (resourcePath(key) !== resourcePath(url)) cache.current.delete(key)
    const saved = cache.current.get(url)
    const timer = setTimeout(() => {
      if (saved && saved.expires > Date.now()) { setState({ url, page: saved.page, error: null }); setBusy(false); return }
      setBusy(true)
      void requestMiraclePage(url, controller.signal)
        .then(page => {
          if (controller.signal.aborted) return
          for (const [key, prior] of cache.current) if (prior.page.revision !== page.revision) cache.current.delete(key)
          cache.current.set(url, { page, expires: Date.now() + 20_000 })
          while (cache.current.size > 24) cache.current.delete(cache.current.keys().next().value!)
          setState({ url, page, error: null })
        })
        .catch(error => { if (!controller.signal.aborted) setState({ url, page: null, error: error instanceof Error ? error.message : "No se pudo cargar la página de milagros." }) })
        .finally(() => { if (!controller.signal.aborted) setBusy(false) })
    }, saved && saved.expires > Date.now() ? 0 : 180)
    return () => { clearTimeout(timer); controller.abort() }
  }, [url, attempt])
  return {
    page: state.url === url ? state.page : null,
    previousPage: resourcePath(state.url) === resourcePath(url) ? state.page : null,
    loading: busy || state.url !== url,
    error: state.url === url ? state.error : null,
    retry: () => { cache.current.clear(); setBusy(true); setAttempt(value => value + 1) },
  }
}
