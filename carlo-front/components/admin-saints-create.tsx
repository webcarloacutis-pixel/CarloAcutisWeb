"use client";
import { useLanguage } from "@/contexts/language-context"

import { catalogWriteError } from "@/lib/catalog-write-error";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function AdminSaintsCreate() {
  const { t } = useLanguage()
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
      setMsg("supplemental.slugNameRequired");
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
        throw new Error(await catalogWriteError(res, "supplemental.writeFailed"));
      }

      setMsg("supplemental.created");
      setSlug("");
      setName("");
      setCountry("");

      // refresca lo que estÃ© mostrando lista en el admin
      window.dispatchEvent(new Event("catalog:saints-changed"));
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message?.startsWith("catalog.") ? e.message : "supplemental.writeFailed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="font-playfair">{t("supplemental.createSaint")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="slug">{t("supplemental.slug")}</Label>
          <Input
            id="slug"
            placeholder={t("supplemental.slug")}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="name">{t("supplemental.name")}</Label>
          <Input
            id="name"
            placeholder={t("supplemental.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="country">{t("supplemental.country")}</Label>
          <Input
            id="country"
            placeholder={t("supplemental.country")}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>

        <Button onClick={onCreate} disabled={loading}>
          {loading ? t("supplemental.creating") : t("supplemental.create")}
        </Button>

        {msg && <p className="text-sm text-muted-foreground">{t(msg)}</p>}
      </CardContent>
    </Card>
  );
}
