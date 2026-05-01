"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Save, ArrowLeft } from "lucide-react"

interface MiracleFormProps {
  onClose: () => void
  onSave: (_miracle: any) => void
  miracle?: any
}

export function MiracleForm({ onClose, onSave, miracle }: MiracleFormProps) {
  const [formData, setFormData] = useState({
    title: miracle?.title || "",
    description: miracle?.description || "",
    date: miracle?.date || "",
    location: miracle?.location || "",
    witnesses: miracle?.witnesses || [],
    verified: miracle?.verified || false,
  })

  const [newWitness, setNewWitness] = useState("")

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addWitness = () => {
    if (newWitness.trim()) {
      setFormData((prev) => ({
        ...prev,
        witnesses: [...prev.witnesses, newWitness.trim()],
      }))
      setNewWitness("")
    }
  }

  const removeWitness = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      witnesses: prev.witnesses.filter((_: string, i: number) => i !== index)
,
    }))
  }

  const handleSave = () => {
    onSave(formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-playfair text-3xl font-bold">{miracle ? "Editar Milagro" : "Nuevo Milagro"}</h2>
          <p className="text-muted-foreground">Documente el milagro con todos los detalles</p>
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
          <CardTitle>Información del Milagro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Título del Milagro *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Los estigmas de Cristo"
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción Completa *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describa detalladamente el milagro..."
              className="min-h-[200px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Fecha del Milagro</Label>
              <Input
                id="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                placeholder="14 de septiembre de 1224"
              />
            </div>
            <div>
              <Label htmlFor="location">Lugar</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="Monte Alverna, Italia"
              />
            </div>
          </div>

          <div>
            <Label>Testigos</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newWitness}
                onChange={(e) => setNewWitness(e.target.value)}
                placeholder="Nombre del testigo..."
                onKeyPress={(e) => e.key === "Enter" && addWitness()}
              />
              <Button onClick={addWitness} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.witnesses.map((witness: string, index: number) => (

                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {witness}
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeWitness(index)} />
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="verified"
              checked={formData.verified}
              onCheckedChange={(checked) => handleInputChange("verified", checked)}
            />
            <Label htmlFor="verified">Verificado por la Iglesia Católica</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
