"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function AdminSaintsCreate() {
  const router = useRouter();
  const baseUrl = '';

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onCreate() {
    setMsg(null);
    if (!slug.trim() || !name.trim()) {
      setMsg("Slug y nombre son obligatorios.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/saints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim(),
          name: name.trim(),
          country: country.trim() || null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }

      setMsg("âœ… Santo creado.");
      setSlug("");
      setName("");
      setCountry("");

      // refresca lo que estÃ© mostrando lista en el admin
      router.refresh();
    } catch (e: any) {
      setMsg(`âŒ ${e?.message ?? "Error creando santo"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="font-playfair">Crear Santo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            placeholder="ej: carlo-acutis"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            placeholder="ej: Carlo Acutis"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="country">PaÃ­s</Label>
          <Input
            id="country"
            placeholder="ej: Italia"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>

        <Button onClick={onCreate} disabled={loading}>
          {loading ? "Creando..." : "Crear"}
        </Button>

        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </CardContent>
    </Card>
  );
}

