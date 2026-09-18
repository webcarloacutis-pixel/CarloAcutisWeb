import { factStatusLabels, historicalYear, imageKindLabels, type Editorial } from "@/lib/editorial";
import { countryName } from "@/lib/content-filters";
import { TranslatedText } from "@/components/translated-text";
import { CatalogImage as Image } from "@/components/catalog-image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Crown, Heart, Sparkles, ArrowLeft } from "lucide-react";

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

export function SaintDetail({ saint }: SaintDetailProps) {
  const patronOf = saint.patronOf ?? [];
  const miracles = saint.miracles ?? [];
  const prayers = saint.prayers ?? [];
  const symbols = saint.symbols ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Navegación */}
      <Button asChild variant="ghost" className="mb-6">
        <Link prefetch={false} href="/santos">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Santos
        </Link>
      </Button>

      {/* Header del santo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-1">
          <div className="relative h-96 rounded-lg overflow-hidden">
            <Image src={saint.image || "/placeholder.svg"} alt={saint.editorial?.image?.alt || saint.name} fill className="object-cover" unoptimized />
          </div>
          {saint.editorial?.image && <p className="mt-2 text-xs text-muted-foreground break-words">{imageKindLabels[saint.editorial.image.kind]}. {saint.editorial.image.attribution}. Versión redimensionada en WebP · <a className="underline" href={saint.editorial.image.sourceUrl} target="_blank" rel="noopener noreferrer">Procedencia</a> · <a className="underline" href={saint.editorial.image.licenseUrl} target="_blank" rel="noopener noreferrer">{saint.editorial.image.license}</a></p>}
        </div>

        <div className="lg:col-span-2">
          <div className="ornate-divider w-24 mb-6"></div>
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-foreground mb-4">{saint.name}</h1>
          {saint.title && <p className="text-xl text-primary font-medium mb-6">{saint.title}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {saint.feastDay && (
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Fiesta:</span>
                <span className="font-medium">{saint.feastDay}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">Lugar de nacimiento:</span>
              <span className="font-medium">{saint.editorial?.birthplaceStatus === "not-applicable" ? "No aplicable" : <>{saint.birthPlace ? saint.birthPlace + ", " : ""}{countryName(saint.birthCountryCode)}{saint.editorial && <> · {factStatusLabels[saint.editorial.birthplaceStatus]}</>}</>}</span>
            </div>

            {saint.editorial ? ([['birthDate','Nacimiento'],['deathDate','Fallecimiento']] as const).map(([key,label])=><div key={key} className="flex flex-wrap items-center gap-2"><span className="text-muted-foreground">{label}:</span><span className="font-medium">{saint.editorial![key].text || factStatusLabels[saint.editorial![key].status]}{saint.editorial![key].text && ` · ${factStatusLabels[saint.editorial![key].status]}`}</span></div>) : <>
              {saint.birthYear != null && <div>Nacimiento: {historicalYear(saint.birthYear)}</div>}
              {saint.deathYear != null && <div>Fallecimiento: {historicalYear(saint.deathYear)}</div>}
            </>}
            {saint.canonizationYear && (
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Canonización:</span>
                <span className="font-medium">{saint.canonizationYear}</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="font-playfair text-lg font-semibold mb-3">Patrono de:</h3>
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
            Biografía
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed text-pretty whitespace-pre-wrap break-words">
            <TranslatedText allowTranslation text={saint.biography ?? "Biografía en construcción…"} />
          </p>
        </CardContent>
      </Card>

      {saint.editorial && <Card className="mb-8"><CardHeader><CardTitle className="font-playfair">Fuentes y notas</CardTitle></CardHeader><CardContent className="space-y-4 break-words"><p>{saint.editorial.ecclesialStatus}</p>{saint.editorial.notes && <p className="whitespace-pre-wrap text-muted-foreground">{saint.editorial.notes}</p>}<ul className="space-y-3">{saint.editorial.sources.map((source,index)=><li key={source.url+index}><a className="font-medium underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><p className="text-sm text-muted-foreground">{source.institution} · Consulta: {source.accessedAt}</p><p className="text-sm">{source.claims.join("; ")}</p></li>)}</ul></CardContent></Card>}

      {/* Milagros */}
      {miracles.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-playfair flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              Relatos de milagros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {miracles.map((miracle, index) => (
                <div key={miracle.id}>
                  <h4 className="font-playfair text-lg font-semibold text-foreground mb-2">{miracle.title}</h4>
                  <p className="text-muted-foreground mb-3 text-pretty whitespace-pre-wrap break-words">{miracle.description}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {miracle.date && (
                      <span>
                        <strong>Fecha:</strong> {miracle.date}
                      </span>
                    )}
                    {miracle.location && (
                      <span>
                        <strong>Lugar:</strong> {miracle.location}
                      </span>
                    )}
                    {miracle.verified && (
                      <Badge variant="outline" className="text-xs">
                        Aprobado en el catálogo
                      </Badge>
                    )}
                  </div>

                  {index < miracles.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Oraciones */}
      {prayers.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-playfair flex items-center gap-2">
              <Heart className="h-5 w-5 text-accent" />
              Oraciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {prayers.map((prayer, index) => (
                <div key={prayer.id}>
                  <h4 className="font-playfair text-lg font-semibold text-foreground mb-2">{prayer.title}</h4>
                  {prayer.occasion && (
                    <p className="text-sm text-muted-foreground mb-3">
                      <strong>Ocasión:</strong> {prayer.occasion}
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
            <CardTitle className="font-playfair">Símbolos Asociados</CardTitle>
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
