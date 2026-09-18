"use client"
import { useEffect, useRef, useState } from "react"
import { createSaintPageCache, requestSaintPage, type SaintPage } from "./saint-pages"

export function useSaintPage(url: string, enabled = true) {
  const cache = useRef(createSaintPageCache())
  const [state, setState] = useState<{ url: string; page: SaintPage | null; error: string | null }>({ url: "", page: null, error: null })
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const saved = cache.current.get(url)
    // The small delay cancels obsolete keystrokes without parallel page requests.
    const timer = setTimeout(() => {
      if (saved) { setState({ url, page: saved, error: null }); setBusy(false); return }
      setBusy(true)
      void requestSaintPage(url, controller.signal)
        .then(page => {
          if (controller.signal.aborted) return
          cache.current.set(url, page)
          setState({ url, page, error: null })
        })
        .catch(error => {
          if (!controller.signal.aborted) setState({ url, page: null, error: error instanceof Error ? error.message : "No se pudo cargar la página del catálogo." })
        })
        .finally(() => { if (!controller.signal.aborted) setBusy(false) })
    }, saved ? 0 : 180)
    return () => { clearTimeout(timer); controller.abort() }
  }, [url, attempt, enabled])
  useEffect(() => {
    function invalidate() { cache.current.clear(); setAttempt(value => value + 1) }
    window.addEventListener("catalog:saints-changed", invalidate)
    return () => window.removeEventListener("catalog:saints-changed", invalidate)
  }, [])
  return {
    page: state.url === url ? state.page : null,
    previousPage: state.page,
    error: state.url === url ? state.error : null,
    loading: enabled && (busy || state.url !== url),
    retry: () => { cache.current.clear(); setBusy(true); setAttempt(value => value + 1) },
  }
}
