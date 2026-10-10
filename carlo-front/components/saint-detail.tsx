import { editorialForDisplay } from "@/lib/editorial-read";
import { historicalYear, type Editorial } from "@/lib/editorial";
import { T } from './t';
import { GeographicName } from './geographic-name';
import { TranslatedText } from "@/components/translated-text";
import { CatalogImage as Image } from "@/components/catalog-image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SaintMiracles } from "./saint-miracles";
import { Calendar, MapPin, Crown, Heart, ArrowLeft } from "lucide-react";

export type Saint = {
  editorial?: Editorial | null;
  id: string;
  slug: string;
  name: string;

  // Campos que tu UI ya usa (pero hoy el backend aún no los manda)
  image?: string | null;
  title?: string | null;
  feastDay?: string | null;
  country?: string | null;
  birthYear?: number | null;
  deathYear?: number | null;
  birthCountryCode?: string | null;
  birthPlace?: string | null;
  canonizationYear?: number | null;
  biography?: string | null;
  patronOf?: string[] | null;

  // Campos “grandes” (pueden venir vacíos mientras crecemos el modelo)
  miracles?: Array<{
    id: string;
    title: string;
    description: string;
    date?: string | null;
    location?: string | null;
    verified?: boolean | null;
  }> | null;

  prayers?: Array<{
    id: string;
    title: string;
    occasion?: string | null;
    text: string;
  }> | null;

  symbols?: string[] | null;
};

interface SaintDetailProps {
  saint: Saint;
}

export function SaintDetail({ saint: input }: SaintDetailProps) {
  const saint = { ...input, editorial: editorialForDisplay(input.editorial) };
  const patronOf = saint.patronOf ?? [];
  const prayers = saint.prayers ?? [];
  const symbols = saint.symbols ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Navegación */}
      <Button asChild variant="ghost" className="mb-6">
        <Link prefetch={false} href="/santos">
          <ArrowLeft className="h-4 w-4 mr-2" />
          <T k="catalog.backSaints" />
        </Link>
      </Button>

      {/* Header del santo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-1">
          <div className="relative aspect-[3/4] max-h-[32rem] rounded-lg overflow-hidden bg-muted">
            <Image src={saint.image || "/placeholder.svg"} alt={saint.editorial?.image?.alt || saint.name} fill className="object-contain" sizes="(max-width: 1024px) 100vw, 360px" loading="eager" fetchPriority="high" />
          </div>
          {saint.editorial?.image && <p className="mt-2 text-xs text-muted-foreground break-words"><T k={'catalog.image.' + saint.editorial.image.kind} />. {saint.editorial.image.attribution}. <T k="catalog.resizedImage" /> · <a className="underline" href={saint.editorial.image.sourceUrl} target="_blank" rel="noopener noreferrer"><T k="catalog.imageSource" /></a> · <a className="underline" href={saint.editorial.image.licenseUrl} target="_blank" rel="noopener noreferrer">{saint.editorial.image.license}</a></p>}
        </div>

        <div className="lg:col-span-2">
          <div className="ornate-divider w-24 mb-6"></div>
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-foreground mb-4">{saint.name}</h1>
          {saint.title && <p className="text-xl text-primary font-medium mb-6">{saint.title}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {saint.feastDay && (
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground"><T k="saints.feastDay" />:</span>
                <span className="font-medium">{saint.feastDay}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground"><T k="catalog.birthPlace" />:</span>
              <span className="font-medium">{saint.editorial?.birthplaceStatus === "not-applicable" ? <T k="catalog.fact.not-applicable" /> : <>{saint.birthPlace ? saint.birthPlace + ", " : ""}<GeographicName code={saint.birthCountryCode} />{saint.editorial && <> · <T k={'catalog.fact.' + saint.editorial.birthplaceStatus} /></>}</>}</span>
            </div>

            {saint.editorial ? ([['birthDate','catalog.birth'],['deathDate','catalog.death']] as const).map(([key,label])=><div key={key} className="flex flex-wrap items-center gap-2"><span className="text-muted-foreground"><T k={label} />:</span><span className="font-medium">{saint.editorial![key].text}{saint.editorial![key].text && ' · '}<T k={'catalog.fact.' + saint.editorial![key].status} /></span></div>) : <>
              {saint.birthYear != null && <div><T k="catalog.birth" />: {historicalYear(saint.birthYear)}</div>}
              {saint.deathYear != null && <div><T k="catalog.death" />: {historicalYear(saint.deathYear)}</div>}
            </>}
            {saint.canonizationYear && (
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground"><T k="catalog.canonization" />:</span>
                <span className="font-medium">{saint.canonizationYear}</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="font-playfair text-lg font-semibold mb-3"><T k="saints.patronOf" />:</h3>
            <div className="flex flex-wrap gap-2">
              {patronOf.length ? (
                patronOf.map((patron, index) => (
                  <Badge key={index} variant="secondary">
                    {patron}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Biografía */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="font-playfair flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <T k="saints.biography" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed text-pretty whitespace-pre-wrap break-words">
            {saint.biography ? <TranslatedText allowTranslation text={saint.biography} /> : <T k="catalog.notDocumented" />}
          </p>
        </CardContent>
      </Card>

      {saint.editorial && <Card className="mb-8"><CardHeader><CardTitle className="font-playfair"><T k="catalog.sourcesNotes" /></CardTitle></CardHeader><CardContent className="space-y-4 break-words"><p>{saint.editorial.ecclesialStatus}</p>{saint.editorial.notes && <p className="whitespace-pre-wrap text-muted-foreground">{saint.editorial.notes}</p>}<ul className="space-y-3">{saint.editorial.sources.map((source,index)=><li key={source.url+index}><a className="font-medium underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><p className="text-sm text-muted-foreground">{source.institution} · <T k="catalog.consulted" />: {source.accessedAt}</p><p className="text-sm">{source.claims.join("; ")}</p></li>)}</ul></CardContent></Card>}

      <SaintMiracles key={saint.id} saintId={saint.id} />

      {/* Oraciones */}
      {prayers.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-playfair flex items-center gap-2">
              <Heart className="h-5 w-5 text-accent" />
            <T k="nav.prayers" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {prayers.map((prayer, index) => (
                <div key={prayer.id}>
                  <h4 className="font-playfair text-lg font-semibold text-foreground mb-2">{prayer.title}</h4>
                  {prayer.occasion && (
                    <p className="text-sm text-muted-foreground mb-3">
                      <strong><T k="catalog.occasion" />:</strong> {prayer.occasion}
                    </p>
                  )}
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-muted-foreground italic leading-relaxed whitespace-pre-wrap break-words">"{prayer.text}"</p>
                  </div>
                  {index < prayers.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Símbolos */}
      {symbols.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-playfair"><T k="catalog.symbols" /></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {symbols.map((symbol, index) => (
                <Badge key={index} variant="outline">
                  {symbol}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
