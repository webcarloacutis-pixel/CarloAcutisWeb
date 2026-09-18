"use client"
import { useEffect, useState } from "react"
import { AdminSaintsList, type Saint } from "./admin-saints-list"
import { Button } from "./ui/button"
import { apiUrl } from "@/lib/api-url"
import { saintPageUrl } from "@/lib/saint-pages"
import { useSaintPage } from "@/lib/use-saint-page"

export function AdminSaintsBrowser({ onAddNew, onEdit }: { onAddNew: () => void; onEdit: (saint: Saint) => void }) {
  const [query, setQuery] = useState("")
  const [cursor, setCursor] = useState<string | null>(null)
  const { page, previousPage, loading, error, retry } = useSaintPage(apiUrl(saintPageUrl({ query, continent: "", country: "", century: "" }, cursor || "")))
  const display = page || (loading ? previousPage : null)
  useEffect(() => {
    function firstPage() { setCursor(null) }
    window.addEventListener("catalog:saints-changed", firstPage)
    return () => window.removeEventListener("catalog:saints-changed", firstPage)
  }, [])
  return <div aria-busy={loading}>
    {loading && <p role="status">Cargando página de santos…</p>}
    {error && <div role="alert" className="space-y-3"><p>{error}</p><Button onClick={retry}>Reintentar</Button>{cursor && <Button onClick={() => setCursor(null)}>Volver a la primera página</Button>}</div>}
    {display && <AdminSaintsList saints={display.items} onAddNew={onAddNew} onEdit={onEdit} remotePage={display} onCursor={setCursor}
      query={query} onQuery={value => { setQuery(value); setCursor(null) }} busy={loading} />}
  </div>
}
