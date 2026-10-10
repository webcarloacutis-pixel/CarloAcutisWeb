"use client"
import { useLanguage } from "@/contexts/language-context"
import { useEffect, useRef, useState } from "react"
import type * as Leaflet from "leaflet"
import "leaflet/dist/leaflet.css"
import { createBirthPopup } from "@/lib/birth-popup"
import { groupBirthLocations, type PublicSaint } from "@/lib/content-filters"
import { formatTranslation } from "@/lib/format-translation"
import { supplementalUiTranslations } from "@/lib/supplemental-ui-translations"

export function WorldMapLeaflet({ saints }: { saints: PublicSaint[] }) {
  const { t, language } = useLanguage()
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
    const canvas = groups.length > 200 ? L.canvas({ padding: 0.5 }) : undefined
    for (const group of groups) {
      const first = group[0]
      const iconNode = document.createElement("span")
      iconNode.className = "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-800 text-white font-bold shadow"
      iconNode.textContent = String(group.length)
      const popup = () => createBirthPopup(group, document, language)
      const copy = supplementalUiTranslations[language] || supplementalUiTranslations.es
      if (canvas) {
        L.circleMarker([first.birthLat!, first.birthLng!], { renderer: canvas, radius: 7, color: "#7f1d1d", fillColor: "#991b1b", fillOpacity: 0.85, weight: 1 })
          .bindTooltip(iconNode).bindPopup(popup, { maxWidth: 280 }).addTo(layer)
        continue
      }
      L.marker([first.birthLat!, first.birthLng!], {
        icon: L.divIcon({ html: iconNode, className: "", iconSize: [32, 32] }),
        keyboard: true,
        title: group.slice(0, 3).map((saint) => saint.name).join(", ") + (group.length > 3 ? formatTranslation(copy["supplemental.moreNames"], { count: group.length - 3 }) : ""),
        alt: formatTranslation(copy["supplemental.markerAria"], { place: first.birthPlace || "", count: group.length }),
      }).bindPopup(popup, { maxWidth: 280 }).addTo(layer)
    }
    if (groups.length) instance.fitBounds(L.latLngBounds(groups.map(([saint]) => [saint.birthLat!, saint.birthLng!] as [number, number])), { padding: [36, 36], maxZoom: 6 })
    else instance.setView([20, 0], 2)
    return () => { layer.remove(); canvas?.remove() }
  }, [saints, ready, language])
  return <div className="relative space-y-3">
    <div ref={container} aria-label={t("supplemental.mapAria")} className="w-full h-96 min-h-[400px] rounded-lg border relative z-0" />
    {!ready && !error && <p role="status">{t("supplemental.mapLoading")}</p>}
    {error && <p role="alert">{t("supplemental.mapFailed")}</p>}
    {(!tilesEnabled || tileError) && <p className="text-sm text-muted-foreground">{t("supplemental.mapBackgroundUnavailable")}</p>}
  </div>
}
