"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Heart } from "lucide-react"
import { useCatalogCollection } from "@/lib/use-catalog-collection"
import { useLanguage } from "@/contexts/language-context"
import { LocalCatalogRecord } from "./local-catalog-record"

export type SaintPrayer = { id: string; title: string; text: string; occasion?: string | null }
type PrayerApi = { id: string; title: string; content: string; occasion: string | null; approved: boolean }
export function SaintPrayers({ saintName, initial }: { saintName: string; initial?: SaintPrayer[] | null }) {
  return initial ? <PrayerContent prayers={initial}/> : <RemotePrayers saintName={saintName}/>
}
function RemotePrayers({ saintName }: { saintName: string }) {
  const { t } = useLanguage()
  const query = new URLSearchParams({ saintName })
  // This collection runs only in the browser effect; its SSR shell needs no backend configuration.
  const {items,loading,error,retry} = useCatalogCollection<PrayerApi>("/api/prayers/approved?"+query)
  if (loading) return <p role="status">{t("common.loading")}</p>
  if (error) return <Card className="mb-8"><CardHeader><CardTitle>{t("nav.prayers")}</CardTitle></CardHeader><CardContent>
    <div role="alert"><p>{t(error)}</p><Button onClick={retry}>{t("content.retry")}</Button></div>
  </CardContent></Card>
  return <PrayerContent prayers={items.filter(p=>p.approved).map(p=>({id:p.id,title:p.title,text:p.content,occasion:p.occasion}))}/>
}
function PrayerContent({prayers}:{prayers:SaintPrayer[]}) {
  const { t } = useLanguage()
  if (!prayers.length) return null
  return <Card className="mb-8"><CardHeader><CardTitle className="font-playfair flex items-center gap-2">
    <Heart className="h-5 w-5 text-accent" aria-hidden="true"/>{t("nav.prayers")}
  </CardTitle></CardHeader><CardContent><div className="space-y-6">
    {prayers.map((source,index)=><LocalCatalogRecord key={source.id} kind="prayer" source={{id:source.id,title:source.title,content:source.text,occasion:source.occasion}}>{(prayer,state)=><div>
      <h4 className="font-playfair text-lg font-semibold text-foreground mb-2">{prayer.title}</h4>
      {prayer.occasion&&<p className="text-sm text-muted-foreground mb-3"><strong>{t("catalog.occasion")}:</strong> {prayer.occasion}</p>}
      <div className="bg-muted/30 p-4 rounded-lg"><p lang={state.translated.includes("content")?state.language:"es"} className="text-muted-foreground italic leading-relaxed whitespace-pre-wrap break-words">“{prayer.content}”</p></div>
      {state.language!=="es"&&<p className="text-xs mt-2">{t(state.translated.includes("content")?"content.unofficialPrayerTranslation":"content.originalSpanish")}</p>}
      {index<prayers.length-1&&<Separator className="mt-6"/>}
    </div>}</LocalCatalogRecord>)}
  </div></CardContent></Card>
}
