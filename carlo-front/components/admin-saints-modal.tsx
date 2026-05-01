"use client";

import { T } from "@/components/t";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Saint = {
  id: string;
  slug: string;
  name: string;
  country?: string | null;
  title?: string | null;
  feastDay?: string | null;
  imageUrl?: string | null;
  biography?: string | null;
  createdAt: string;
  updatedAt: string;
  continent?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  saint?: Partial<Saint>;
};

export function AdminSaintsModal({ open, onClose, saint }: Props) {
  const router = useRouter();
  const baseUrl = '';
  const isEdit = !!saint?.id;

  const initial = useMemo(() => {
    return {
      slug: saint?.slug ?? "",
      name: saint?.name ?? "",
      country: (saint?.country ?? "") as string,
      continent: (saint?.continent ?? "") as string,
      lat: (saint?.lat ?? "") as any,
      lng: (saint?.lng ?? "") as any,
      title: (saint?.title ?? "") as string,
      feastDay: (saint?.feastDay ?? "") as string,
      imageUrl: (saint?.imageUrl ?? "") as string,
      biography: (saint?.biography ?? "") as string,
    };
  }, [saint]);

  const [slug, setSlug] = useState(initial.slug);
  const [name, setName] = useState(initial.name);
  const [country, setCountry] = useState(initial.country);
  const [continent, setContinent] = useState((initial as any).continent || "");
  const [lat, setLat] = useState(String((initial as any).lat ?? ""));
  const [lng, setLng] = useState(String((initial as any).lng ?? ""));
  const [title, setTitle] = useState(initial.title);
  const [feastDay, setFeastDay] = useState(initial.feastDay);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);
  const [biography, setBiography] = useState(initial.biography);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function slugify(input: string) {
    return (input || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  useEffect(() => {
    setSlug(initial.slug || "");
    setName(initial.name || "");
    setCountry(initial.country || "");
    setTitle(initial.title || "");
    setFeastDay(initial.feastDay || "");
    setImageUrl(initial.imageUrl || "");
    setBiography(initial.biography || "");
    setMsg(null);
  }, [initial]);

  if (!open) return null;

  async function onSubmit() {
    setMsg(null);

    if (!name.trim()) {
      setMsg("Nombre es obligatorio.");
      return;
    }

    const safeSlug = slug.trim() || slugify(name);

    setLoading(true);
    const latNum = lat.trim() === "" ? null : Number(lat);
    const lngNum = lng.trim() === "" ? null : Number(lng);

    if ((latNum === null) !== (lngNum === null)) {
      setMsg("Debes llenar lat y lng juntos (o dejar ambos vacÃ­os).");
      setLoading(false);
      return;
    }
    if ((latNum !== null && Number.isNaN(latNum)) || (lngNum !== null && Number.isNaN(lngNum))) {
      setMsg("lat/lng deben ser nÃºmeros.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        slug: safeSlug,
        name: name.trim(),
        country: country.trim() || null,
        continent: continent.trim() || null,
        lat: latNum,
        lng: lngNum,
        title: title.trim() || null,
        feastDay: feastDay.trim() || null,
        imageUrl: imageUrl.trim() || null,
        biography: biography.trim() || null,
      };

      const url = isEdit ? `${baseUrl}/saints/${saint!.id}` : `${baseUrl}/saints`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Error ${res.status}`);
      }

      router.refresh();
      onClose();
    } catch (e: any) {
      setMsg(`âŒ ${e?.message ?? "Error guardando santo"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{isEdit ? "Editar santo" : "Crear santo"}</div>
            <div className="text-sm text-muted-foreground">Completa los datos y guarda.</div>
          </div>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cerrar
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="ej: carlo-acutis"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                if (!isEdit) setSlug(slugify(v));
              }}
              placeholder="ej: Carlo Acutis"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="country">PaÃ­s</Label>
            <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="ej: Italia" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="continent"><T k="saints.continent" /></Label>
            <Input
              id="continent"
              value={continent}
              onChange={(e) => setContinent(e.target.value)}
              placeholder="ej: Europa"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="lat">Latitud</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="ej: 41.8719"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lng">Longitud</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="ej: 12.5674"
              />
            </div>
          </div>


          <div className="grid gap-2">
            <Label htmlFor="title">TÃ­tulo (Beato / Santo / etc.)</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ej: Beato" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="feastDay">DÃ­a festivo</Label>
            <Input id="feastDay" value={feastDay} onChange={(e) => setFeastDay(e.target.value)} placeholder="ej: 12/10" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="imageUrl">URL de imagen</Label>
            <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            <p className="text-xs text-muted-foreground">
              Tip: usa un link directo a imagen (termina en .jpg/.png/.svg) o de Wikimedia.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="biography">BiografÃ­a</Label>
            <textarea
              id="biography"
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Escribe la biografÃ­a..."
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={onSubmit} disabled={loading}>
              {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear"}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
          </div>

          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

