"use client";
import { T } from "@/components/t";


import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Crown } from "lucide-react";
import { TranslatedText } from "@/components/translated-text";


export type Saint = {
  id: string;
  slug: string;
  name: string;
  country?: string | null;

  // ✅ nuevos campos del backend
  imageUrl?: string | null;
  title?: string | null;
  feastDay?: string | null;
  biography?: string | null;

  // opcionales por si luego los agregas
  patronOf?: string[] | null;
  canonizationYear?: number | null;

  createdAt: string;
  updatedAt: string;
};

type Props = {
  saints: Saint[];
};

export function SaintsList({ saints }: Props) {
  const [visibleCount, setVisibleCount] = useState(6);

  const visibleSaints = useMemo(() => saints.slice(0, visibleCount), [saints, visibleCount]);
  const hasMore = visibleCount < saints.length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleSaints.map((saint) => {
          const imgSrc =
            saint.imageUrl?.startsWith("data:")
              ? saint.imageUrl
              : saint.imageUrl || "/placeholder.svg";

          return (
            <Card key={saint.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={imgSrc}
                  alt={saint.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-playfair text-xl font-bold text-white mb-1">{saint.name}</h3>
                  <p className="text-white/90 text-sm">{saint.title ?? ""}</p>
                </div>
              </div>

              <CardHeader className="pb-3">
                {saint.feastDay ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{saint.feastDay}</span>
                  </div>
                ) : null}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{saint.country ?? "—"}</span>
                </div>

                {typeof saint.canonizationYear === "number" ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Crown className="h-4 w-4" />
                    <span>Canonizado en {saint.canonizationYear}</span>
                  </div>
                ) : null}
              </CardHeader>

              <CardContent className="pt-0">
                {saint.biography ? (
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3"><TranslatedText text={saint.biography} /></p>
                ) : null}

                {Array.isArray(saint.patronOf) && saint.patronOf.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {saint.patronOf.slice(0, 3).map((patron, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {patron}
                      </Badge>
                    ))}
                    {saint.patronOf.length > 3 ? (
                      <Badge variant="outline" className="text-xs">
                        +{saint.patronOf.length - 3}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}

                <Button asChild className="w-full bg-transparent" variant="outline">
                  <Link href={`/santos/${saint.slug}`}><T k="saints.viewFullBio" /></Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hasMore ? (
        <div className="text-center">
          <Button onClick={() => setVisibleCount((prev) => prev + 6)} variant="outline" size="lg">
            Cargar Más Santos
          </Button>
        </div>
      ) : null}
    </div>
  );
}
