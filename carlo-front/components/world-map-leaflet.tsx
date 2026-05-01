"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Users, Star } from "lucide-react"

type ApiSaint = {
  id: string
  slug: string
  name: string
  country: string | null
  continent: string | null
  lat: number | null
  lng: number | null
  feastDay?: string | null
  imageUrl?: string | null
}

export function WorldMapLeaflet() {
  const mapRef = useRef<HTMLDivElement>(null)
  const markersLayerRef = useRef<any>(null)
  const iconRef = useRef<any>(null)

  const leafletMapRef = useRef<any>(null)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [map, setMap] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const [saints, setSaints] = useState<ApiSaint[]>([])
  const [error, setError] = useState<string | null>(null)

  const baseUrl = ''

  // 1) Traer santos desde el API
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const res = await fetch(`${baseUrl}/saints`, { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP_${res.status}`)
        const data = (await res.json()) as ApiSaint[]
        if (!cancelled) setSaints(Array.isArray(data) ? data : [])
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Error cargando santos")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [baseUrl])

  // Agrupar por paÃ­s (para la tarjeta superior)
  const countriesData = useMemo(() => {
    const acc: Record<string, ApiSaint[]> = {}
    for (const s of saints) {
      const c = (s.country || "Desconocido").trim() || "Desconocido"
      if (!acc[c]) acc[c] = []
      acc[c].push(s)
    }
    return acc
  }, [saints])

  // Solo santos con coordenadas para marcadores
  const saintsWithCoords = useMemo(
    () => saints.filter((s) => typeof s.lat === "number" && typeof s.lng === "number"),
    [saints],
  )

  // 2) Cargar Leaflet e inicializar mapa una sola vez
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return

    const loadLeaflet = async () => {
      // CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      // JS
      if (!(window as any).L) {
        const script = document.createElement("script")
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        document.head.appendChild(script)
        await new Promise((resolve) => {
          script.onload = resolve
        })
      }

      const L = (window as any).L

      // âœ… evita doble init (StrictMode/FastRefresh)
      if (!mapRef.current) return
      if (leafletMapRef.current) return

      // âœ… si Fast Refresh dejÃ³ el contenedor â€œsucioâ€, limpia el id interno
      const container: any = mapRef.current
      if (container && container._leaflet_id) {
        container._leaflet_id = null
      }

      const leafletMap = L.map(mapRef.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 1,
        maxZoom: 10,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true,
      })


      leafletMapRef.current = leafletMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: 'Â© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(leafletMap)

      // Icono
      iconRef.current = L.divIcon({
        className: "saint-marker",
        html: `
          <div class="saint-marker-content">
            <div class="saint-marker-inner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="#D4AF37"/>
                <circle cx="12" cy="12" r="8" fill="#8B0000" stroke="#D4AF37" strokeWidth="2"/>
                <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">S</text>
              </svg>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      })

      // Layer para markers (para limpiar/repintar)
      markersLayerRef.current = L.layerGroup().addTo(leafletMap)

      // helpers globales
      ;(window as any).goToSaint = (slug: string) => {
        window.location.href = `/santos/${slug}`
      }
      ;(window as any).exploreCountry = (countryName: string) => {
        setSelectedCountry(countryName)
      }

      setMap(leafletMap)
      setIsLoaded(true)
    }

    loadLeaflet()

    return () => {
      try {
        if (leafletMapRef.current) {
          leafletMapRef.current.remove()
          leafletMapRef.current = null
        }
      } catch {}
      markersLayerRef.current = null
    }// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 3) Pintar marcadores cada vez que cambian los santos con coords
  useEffect(() => {
    if (!map) return
    const L = (window as any).L
    if (!L || !markersLayerRef.current || !iconRef.current) return

    const layer = markersLayerRef.current
    layer.clearLayers()

    saintsWithCoords.forEach((saint) => {
      const country = (saint.country || "Desconocido").trim() || "Desconocido"
      const continent = saint.continent || ""

      const marker = L.marker([saint.lat, saint.lng], { icon: iconRef.current })
        .addTo(layer)
        .bindPopup(`
          <div class="saint-popup">
            <h3 class="font-playfair text-lg font-semibold text-primary mb-1">${saint.name}</h3>
            <p class="text-sm text-muted-foreground mb-2">${country}${continent ? " â€¢ " + continent : ""}</p>
            <div class="flex gap-2">
              <button onclick="window.goToSaint('${saint.slug}')" class="w-full bg-primary text-primary-foreground px-3 py-2 rounded text-sm hover:bg-primary/90 transition-colors">
                Ver Santo
              </button>
            </div>
          </div>
        `)

      marker.on("click", () => setSelectedCountry(country))
    })
  }, [map, saintsWithCoords])

  return (
    <div className="relative">
      <style jsx global>{`
        .saint-marker-content {
          position: relative;
          width: 32px;
          height: 32px;
        }
        .saint-marker-inner {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transition: transform 0.2s ease;
        }
        .saint-marker:hover .saint-marker-inner {
          transform: scale(1.2);
        }
        .saint-popup {
          min-width: 220px;
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        }
        .leaflet-popup-tip {
          background: white;
        }
      `}</style>

      <div ref={mapRef} className="w-full h-96 rounded-lg overflow-hidden shadow-lg border border-border" style={{ minHeight: "400px" }} />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Cargando mapa mundial...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000]">
          <Card className="bg-card/95 backdrop-blur-sm shadow-xl border-destructive">
            <CardContent className="p-4">
              <p className="text-sm">
                Error cargando santos del API: <span className="font-mono">{error}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Revisa NEXT_PUBLIC_API_URL o que el backend estÃ© prendido en {baseUrl}.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedCountry && countriesData[selectedCountry] && (
        <div className="absolute top-4 left-4 right-4 z-[1000]">
          <Card className="bg-card/95 backdrop-blur-sm shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-playfair text-xl font-semibold text-primary flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {selectedCountry}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCountry(null)} className="h-8 w-8 p-0">
                  âœ•
                </Button>
              </div>

              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {countriesData[selectedCountry].length} santos
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-4 w-4" />
                  TradiciÃ³n catÃ³lica
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {countriesData[selectedCountry].slice(0, 4).map((saint) => (
                  <Badge key={saint.id} variant="secondary" className="text-xs">
                    {saint.name}
                  </Badge>
                ))}
                {countriesData[selectedCountry].length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{countriesData[selectedCountry].length - 4} mÃ¡s
                  </Badge>
                )}
              </div>

              <Button className="w-full" size="sm" onClick={() => (window.location.href = `/santos?country=${encodeURIComponent(selectedCountry)}`)}>
                Ver todos los santos de {selectedCountry}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

