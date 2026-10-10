"use client"
import { formatTranslation } from "@/lib/format-translation"
import { useLanguage } from "@/contexts/language-context"

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
  const { t } = useLanguage()
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
          <h2 className="font-playfair text-3xl font-bold">{miracle ? t("supplemental.editMiracle") : t("supplemental.newMiracle")}</h2>
          <p className="text-muted-foreground">{t("supplemental.miracleHelp")}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} className="bg-primary">
            <Save className="h-4 w-4 mr-2" />
            {t("common.save")}</Button>
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back")}</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("supplemental.newMiracle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">{t("supplemental.title")}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder={t("supplemental.title")}
            />
          </div>

          <div>
            <Label htmlFor="description">{t("supplemental.description")}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder={t("supplemental.description")}
              className="min-h-[200px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">{t("supplemental.date")}</Label>
              <Input
                id="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                placeholder={t("supplemental.date")}
              />
            </div>
            <div>
              <Label htmlFor="location">{t("supplemental.location")}</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder={t("supplemental.location")}
              />
            </div>
          </div>

          <div>
            <Label>{t("catalog.witnesses")}</Label>
            <div className="flex gap-2 mb-2">
              <Input
                aria-label={t("catalog.witnesses")} value={newWitness}
                onChange={(e) => setNewWitness(e.target.value)}
                placeholder={t("supplemental.name")}
                onKeyPress={(e) => e.key === "Enter" && addWitness()}
              />
              <Button aria-label={t("supplemental.addWitness")} onClick={addWitness} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.witnesses.map((witness: string, index: number) => (

                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {witness}
                  <button type="button" aria-label={formatTranslation(t("supplemental.removeWitness"), { name: witness })} onClick={() => removeWitness(index)}><X aria-hidden="true" className="h-3 w-3 hover:text-destructive" /></button>
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
            <Label htmlFor="verified">{t("catalog.approved")}</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
