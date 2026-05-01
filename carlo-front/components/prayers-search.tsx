"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  saints: string[];
  occasions: string[];
  categories?: string[];
  initialQuery?: string;
  initialSaint?: string;
  initialOccasion?: string;
  initialCategory?: string;
};

export function PrayersSearch({
  saints,
  occasions,
  categories = [],
  initialQuery = "",
  initialSaint = "",
  initialOccasion = "",
  initialCategory = "",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedSaint, setSelectedSaint] = useState(initialSaint);
  const [selectedOccasion, setSelectedOccasion] = useState(initialOccasion);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const saintsSorted = useMemo(() => [...new Set(saints)].filter(Boolean).sort(), [saints]);
  const occasionsSorted = useMemo(() => [...new Set(occasions)].filter(Boolean).sort(), [occasions]);
  const categoriesSorted = useMemo(() => [...new Set(categories)].filter(Boolean).sort(), [categories]);

  function goSearch() {
    const params = new URLSearchParams();

    if (searchTerm.trim()) params.set("q", searchTerm.trim());
    if (selectedSaint.trim()) params.set("santo", selectedSaint.trim());
    if (selectedOccasion.trim()) params.set("ocasion", selectedOccasion.trim());
    if (selectedCategory.trim()) params.set("categoria", selectedCategory.trim());

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/oraciones?${qs}#resultados` : "/oraciones");
    });
  }

  function clear() {
    setSearchTerm("");
    setSelectedSaint("");
    setSelectedOccasion("");
    setSelectedCategory("");
    startTransition(() => router.push("/oraciones"));
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Oraciones
          </CardTitle>

          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Más filtros"
            onClick={() => setShowMoreFilters((v) => !v)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goSearch();
          }}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
        >
          <div className="md:col-span-4">
            <Input
              placeholder="Buscar por título o contenido…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="md:col-span-3">
            <Select value={selectedSaint} onValueChange={(v) => setSelectedSaint(v === "__ALL__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar santo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todos</SelectItem>
                {saintsSorted.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3">
            <Select value={selectedOccasion} onValueChange={(v) => setSelectedOccasion(v === "__ALL__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Ocasión" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todas</SelectItem>
                {occasionsSorted.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" className="w-full" disabled={isPending}>
              Buscar
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Limpiar"
              onClick={clear}
              disabled={isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {showMoreFilters && (
            <div className="md:col-span-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                <Select
                  value={selectedCategory || "ALL"}
                  onValueChange={(v) => setSelectedCategory(v === "ALL" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">Todas</SelectItem>
                    {categoriesSorted.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="md:col-span-2 text-sm text-muted-foreground flex items-center">
                  Tip: también puedes entrar por “Categorías de Oraciones” y te baja a resultados automáticamente.
                </div>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
