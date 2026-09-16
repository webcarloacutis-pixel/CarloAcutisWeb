"use client"
import { useEffect, useRef, useState } from "react"
import type * as Leaflet from "leaflet"
import "leaflet/dist/leaflet.css"
import { createBirthPopup } from "@/lib/birth-popup"
import { groupBirthLocations, type PublicSaint } from "@/lib/content-filters"

export function WorldMapLeaflet({ saints }: { saints: PublicSaint[] }) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<Leaflet.Map | null>(null)
  const library = useRef<typeof Leaflet | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [tileError, setTileError] = useState(false)
  const tilesEnabled = process.env.NEXT_PUBLIC_MAP_TILES_ENABLED === "true"
  useEffect(() => {
    let cancelled = false
    import("leaflet").then((L) => {
      if (cancelled || !container.current) return
      library.current = L
      const instance = L.map(container.current, { center: [20, 0], zoom: 2, minZoom: 1, maxZoom: 14, keyboard: true, scrollWheelZoom: false })
      map.current = instance
      if (tilesEnabled) {
        L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).on("tileerror", () => { if (!cancelled) setTileError(true) }).addTo(instance)
      }
      setReady(true)
    }).catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true; map.current?.remove(); map.current = null; library.current = null }
  }, [tilesEnabled])

  useEffect(() => {
    const L = library.current, instance = map.current
    if (!ready || !L || !instance) return
    const layer = L.layerGroup().addTo(instance)
    const groups = groupBirthLocations(saints)
    for (const group of groups) {
      const first = group[0]
      const iconNode = document.createElement("span")
      iconNode.className = "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-800 text-white font-bold shadow"
      iconNode.textContent = String(group.length)
      const popup = createBirthPopup(group)
      L.marker([first.birthLat!, first.birthLng!], {
        icon: L.divIcon({ html: iconNode, className: "", iconSize: [32, 32] }),
        keyboard: true,
        title: group.map((saint) => saint.name).join(", "),
        alt: first.birthPlace + ": " + group.length + " santos. Abrir detalles",
      }).bindPopup(popup, { maxWidth: 280 }).addTo(layer)
    }
    if (groups.length) instance.fitBounds(L.latLngBounds(groups.map(([saint]) => [saint.birthLat!, saint.birthLng!] as [number, number])), { padding: [36, 36], maxZoom: 6 })
    else instance.setView([20, 0], 2)
    return () => { layer.remove() }
  }, [saints, ready])
  return <div className="relative space-y-3">
    <div ref={container} aria-label="Mapa de lugares de nacimiento. Usa las flechas y las teclas más y menos para navegar." className="w-full h-96 min-h-[400px] rounded-lg border relative z-0" />
    {!ready && !error && <p role="status">Cargando mapa mundial…</p>}
    {error && <p role="alert">No se pudo cargar el mapa. Puedes consultar los santos en el listado.</p>}
    {(!tilesEnabled || tileError) && <p className="text-sm text-muted-foreground">El mapa de fondo no está disponible. Los lugares documentados siguen disponibles en el listado.</p>}
  </div>
}
