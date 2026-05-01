"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Minus, RotateCcw } from "lucide-react"
import { saints } from "@/lib/saints-data"

interface CountryData {
  name: string
  saints: typeof saints
  coordinates: [number, number]
}

export function WorldMap() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const mapRef = useRef<HTMLDivElement>(null)

  const countriesData: Record<string, CountryData> = {}
  saints.forEach((saint) => {
    if (!countriesData[saint.country]) {
      countriesData[saint.country] = {
        name: saint.country,
        saints: [],
        coordinates: saint.coordinates,
      }
    }
    countriesData[saint.country].saints.push(saint)
  })

  const countries = Object.values(countriesData)

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.5, 4))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.5, 0.5))
  }

  const handleReset = () => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
    setSelectedCountry(null)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="relative w-full h-96 bg-gradient-to-b from-sky-200 to-sky-100 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute inset-0 transition-transform duration-200 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-2w4FJRqcqqmkOCIOPRiGRUdEfVtLjH.png"
            alt="Mapa Mundial"
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />

          {countries.map((country, _index) => {
            // Convertir coordenadas geográficas a posición en la imagen
            const x = ((country.coordinates[1] + 180) / 360) * 100
            const y = ((90 - country.coordinates[0]) / 180) * 100

            return (
              <div
                key={country.name}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
              >
                {/* Marcador */}
                <div
                  className="w-6 h-6 bg-red-600 border-2 border-white rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedCountry(country.name)
                  }}
                  onMouseEnter={() => setHoveredCountry(country.name)}
                  onMouseLeave={() => setHoveredCountry(null)}
                >
                  <span className="text-white text-xs font-bold">{country.saints.length}</span>
                </div>

                {/* Tooltip */}
                {hoveredCountry === country.name && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                    {country.name}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="absolute top-4 right-4 flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-none border-b hover:bg-gray-50"
            onClick={handleZoomIn}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-none border-b hover:bg-gray-50"
            onClick={handleZoomOut}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-10 w-10 rounded-none hover:bg-gray-50" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {selectedCountry && countriesData[selectedCountry] && (
          <div className="absolute top-4 left-4 right-20">
            <Card className="bg-card/95 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-playfair text-lg font-semibold">{selectedCountry}</h3>
                  <button
                    onClick={() => setSelectedCountry(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {countriesData[selectedCountry].saints.length} santos documentados
                </p>
                <div className="flex flex-wrap gap-1">
                  {countriesData[selectedCountry].saints.slice(0, 3).map((saint) => (
                    <Badge key={saint.id} variant="secondary" className="text-xs">
                      {saint.name}
                    </Badge>
                  ))}
                  {countriesData[selectedCountry].saints.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{countriesData[selectedCountry].saints.length - 3} más
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-xs">
          Zoom: {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  )
}
