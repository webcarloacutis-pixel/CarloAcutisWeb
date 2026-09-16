"use client"
import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
export function ScrollToResults() {
  const params = useSearchParams()
  useEffect(() => {
    if (!["q", "query", "busqueda", "santo", "saint", "ocasion", "occasion", "categoria", "category"].some((key) => params.get(key))) return
    document.getElementById("resultados")?.scrollIntoView({ behavior: "auto", block: "start" })
  }, [params])
  return null
}
