"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, ArrowLeft } from "lucide-react"

interface PrayerFormProps {
  onClose: () => void
  onSave: (_prayer: any) => void
  prayer?: any
}

export function PrayerForm({ onClose, onSave, prayer }: PrayerFormProps) {
  const [formData, setFormData] = useState({
    title: prayer?.title || "",
    text: prayer?.text || "",
    occasion: prayer?.occasion || "",
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    onSave(formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-playfair text-3xl font-bold">{prayer ? "Editar Oración" : "Nueva Oración"}</h2>
          <p className="text-muted-foreground">Agregue una oración asociada al santo</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} className="bg-primary">
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Oración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Título de la Oración *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Oración de San Francisco"
            />
          </div>

          <div>
            <Label htmlFor="occasion">Ocasión de Uso *</Label>
            <Input
              id="occasion"
              value={formData.occasion}
              onChange={(e) => handleInputChange("occasion", e.target.value)}
              placeholder="Para la paz y la reconciliación"
            />
          </div>

          <div>
            <Label htmlFor="text">Texto Completo de la Oración *</Label>
            <Textarea
              id="text"
              value={formData.text}
              onChange={(e) => handleInputChange("text", e.target.value)}
              placeholder="Señor, haz de mí un instrumento de tu paz..."
              className="min-h-[300px]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
