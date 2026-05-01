"use client";
import { T } from "@/components/t";


import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type DbPrayer = {
  id: string;
  title: string;
  content: string;
  category?: string | null;
};

type CategoryCard = {
  title: string;
  description: string;
  tags: string[];
};

const CATEGORIES: CategoryCard[] = [
  {
    title: "Protección y Fortaleza",
    description: "Oraciones para pedir protección divina y fortaleza espiritual",
    tags: ["Protección", "Fortaleza", "Valor"],
  },
  {
    title: "Sanación y Consuelo",
    description: "Oraciones para momentos de enfermedad y necesidad de consuelo",
    tags: ["Sanación", "Consuelo", "Enfermedad"],
  },
  {
    title: "Gratitud y Alabanza",
    description: "Oraciones de agradecimiento y alabanza a Dios",
    tags: ["Gratitud", "Alabanza", "Acción de gracias"],
  },
  {
    title: "Guía y Sabiduría",
    description: "Oraciones para pedir guía divina y sabiduría",
    tags: ["Guía", "Sabiduría", "Discernimiento"],
  },
  {
    title: "Intercesión y Petición",
    description: "Oraciones de intercesión por otros y peticiones especiales",
    tags: ["Intercesión", "Petición", "Necesidades"],
  },
  {
    title: "Devoción Mariana",
    description: "Oraciones dedicadas a la Santísima Virgen María",
    tags: ["Virgen María", "Rosario", "Advocaciones marianas"],
  },
];

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

export function PrayersCategories({ prayers }: { prayers: DbPrayer[] }) {
  const router = useRouter();

  const counts = useMemo(() => {
    const arr = prayers || [];
    return CATEGORIES.map((cat) => {
      const tagSlugs = cat.tags.map(slugify);
      const n = arr.filter((p) => {
        const c = slugify(p.category || "");
        if (!c) return false;
        // match flexible: category contains any tag, or tag contains category
        return tagSlugs.some((t) => c.includes(t) || t.includes(c));
      }).length;
      return n;
    });
  }, [prayers]);

  function explore(cat: CategoryCard) {
    // usamos el primer tag como filtro base (suele ser “Protección”, “Sanación”, etc.)
    const categoria = cat.tags[0] || cat.title;
    const params = new URLSearchParams();
    params.set("categoria", categoria);
    router.push(`/oraciones?${params.toString()}#resultados`);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-playfair text-3xl font-bold text-foreground mb-2">
          Categorías de Oraciones
        </h2>
        <p className="text-muted-foreground">
          Explora oraciones organizadas por temas y necesidades espirituales
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORIES.map((cat, idx) => (
          <Card key={cat.title} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl">{cat.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{cat.description}</p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {cat.tags.slice(0, 3).map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
                {cat.tags.length > 3 ? (
                  <Badge variant="outline">+{cat.tags.length - 3}</Badge>
                ) : null}
              </div>

              <div className="text-sm text-muted-foreground">
                {counts[idx]} oraciones disponibles
              </div>

              <Button variant="outline" className="w-full" onClick={() => explore(cat)}>
                <T k="footer.explore" /> Oraciones
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
