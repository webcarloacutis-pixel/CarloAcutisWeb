"use client"
import { useLanguage } from "@/contexts/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe } from "lucide-react"
export function MapLegend() {
  const { t } = useLanguage()
  return <Card><CardHeader><CardTitle className="font-playfair flex items-center gap-2"><Globe className="h-5 w-5 text-primary" aria-hidden="true" />{t("supplemental.mapLegend")}</CardTitle></CardHeader>
    <CardContent className="space-y-3 text-sm text-muted-foreground">
      <p>{t("supplemental.mapMarkersHelp")}</p>
      <p>{t("supplemental.mapGroupsHelp")}</p>
      <p>{t("supplemental.mapFiltersHelp")}</p>
      <p>{t("supplemental.mapNavigationHelp")}</p>
    </CardContent></Card>
}
