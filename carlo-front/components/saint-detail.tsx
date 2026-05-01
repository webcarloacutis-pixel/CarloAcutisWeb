import { TranslatedText } from "@/components/translated-text";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Crown, Heart, Sparkles, ArrowLeft } from "lucide-react";

export type Saint = {
  id: string;
  slug: string;
  name: string;

  // Campos que tu UI ya usa (pero hoy el backend aún no los manda)
  image?: string | null;
  title?: string | null;
  feastDay?: string | null;
  country?: string | null;
  birthYear?: number | null;
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
        <Link href="/santos">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Santos
        </Link>
      </Button>

      {/* Header del santo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-1">
          <div className="relative h-96 rounded-lg overflow-hidden">
            <Image src={saint.image || "/placeholder.svg"} alt={saint.name} fill className="object-cover" />
          </div>
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
              <span className="text-muted-foreground">País:</span>
              <span className="font-medium">{saint.country ?? "—"}</span>
            </div>

            {saint.birthYear && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Nacimiento:</span>
                <span className="font-medium">{saint.birthYear}</span>
              </div>
            )}

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
          <p className="text-muted-foreground leading-relaxed text-pretty">
            <TranslatedText text={saint.biography ?? "Biografía en construcción…"} />
          </p>
        </CardContent>
      </Card>

      {/* Milagros */}
      {miracles.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-playfair flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              Milagros Documentados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {miracles.map((miracle, index) => (
                <div key={miracle.id}>
                  <h4 className="font-playfair text-lg font-semibold text-foreground mb-2">{miracle.title}</h4>
                  <p className="text-muted-foreground mb-3 text-pretty">{miracle.description}</p>

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
                        Verificado por la Iglesia
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
                    <p className="text-muted-foreground italic leading-relaxed text-pretty">"{prayer.text}"</p>
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
