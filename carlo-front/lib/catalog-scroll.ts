"use client"
import { useEffect } from "react"
import { catalogReturn } from "./catalog-return"

const key = "acutis_catalog_scroll"
type Position = { url: string; y: number; at: number }
function read(): Position[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) || "[]")
    if (!Array.isArray(value)) return []
    return value.filter((item): item is Position => item && typeof item.url === "string" &&
      catalogReturn(item.url) === item.url && Number.isFinite(item.y) && item.y >= 0 &&
      Number.isFinite(item.at) && Date.now() - item.at < 3_600_000).slice(-10)
  } catch { return [] }
}
/** Only invoked by Next's same-tab onNavigate; modified/new-tab links remain native. */
export function rememberCatalogScroll() {
  const url = catalogReturn(location.pathname + location.search)
  try { sessionStorage.setItem(key, JSON.stringify([...read().filter(item => item.url !== url), { url, y: scrollY, at: Date.now() }].slice(-10))) }
  catch { /* Navigation still works when session storage is unavailable. */ }
}
export function useCatalogScroll(context?: string) {
  useEffect(() => {
    const url = catalogReturn(location.pathname + location.search)
    const position = read().find(item => item.url === url)
    if (!position) return
    // Wait for Next's layout restoration before restoring this exact filter/page context.
    let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => window.scrollTo({ top: position.y, behavior: "instant" })) })
    return () => cancelAnimationFrame(frame)
  }, [context])
}
