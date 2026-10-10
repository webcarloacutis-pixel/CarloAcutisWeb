"use client"
import { useLanguage } from "@/contexts/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LocalCatalogRecord } from "./local-catalog-record";

type Prayer = {
  id: string;
  title: string;
  content: string;
  category?: string | null;
  saintName?: string | null;
  occasion?: string | null;
};

export function PrayersResults({ prayers }: { prayers: Prayer[] }) {
  const { t } = useLanguage()
  if (!prayers || prayers.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        {t("supplemental.prayersEmpty")}</div>
    );
  }

  return (
    <div className="space-y-4">
      {prayers.map((source) => <LocalCatalogRecord key={source.id} kind="prayer" source={source}>{(p,state)=>(
        <Card className="min-w-0">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg">{p.title}</CardTitle>

            <div className="flex flex-wrap gap-2">
              {p.category ? <Badge variant="secondary">{p.category}</Badge> : null}
              {p.saintName ? <Badge variant="outline">{p.saintName}</Badge> : null}
              {p.occasion ? <Badge variant="outline">{p.occasion}</Badge> : null}
            </div>
          </CardHeader>

          <CardContent>
            <p lang={state.translated.includes("content")?state.language:"es"} className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
              {p.content}
            </p>
            {state.language!=="es"&&<p className="text-xs mt-2">{t(state.translated.includes("content")?"content.unofficialPrayerTranslation":"content.originalSpanish")}</p>}
          </CardContent>
        </Card>
      )}</LocalCatalogRecord>)}
    </div>
  );
}
