"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2, MapPin, Calendar } from "lucide-react";

export type Saint = {
  id: string;
  slug: string;
  name: string;
  country?: string | null;
    imageUrl?: string | null;
createdAt: string;
  updatedAt: string;
  title?: string | null;
feastDay?: string | null;
biography?: string | null;

};

type AdminSaintsListProps = {
  saints: Saint[];
  onAddNew: () => void;
  onEdit: (_saint: Saint) => void;
};

export function AdminSaintsList({ saints, onAddNew, onEdit }: AdminSaintsListProps) {
  const router = useRouter();
  const baseUrl = '';

  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredSaints = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return (Array.isArray(saints) ? saints : []).filter((s) => {
      return (
        s.name.toLowerCase().includes(q) ||
        (s.country ?? "").toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q)
      );
    });
  }, [saints, searchTerm]);

  async function onDelete(id: string) {
    const ok = confirm("Â¿Seguro que quieres eliminar este santo?");
    if (!ok) return;

    setDeletingId(id);
    try {
      const res = await fetch(`${baseUrl}/saints/${id}`, { method: "DELETE" });

      if (!res.ok && res.status !== 204) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }

      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? "Error eliminando santo");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-playfair text-3xl font-bold">GestiÃ³n de Santos</h2>
          <p className="text-muted-foreground">Administre la informaciÃ³n de todos los santos</p>
        </div>

        <Button onClick={onAddNew} className="bg-primary">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Santo
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar santos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">{filteredSaints.length} santos encontrados</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSaints.map((_saint) => {
          const imgSrc =
            _saint.imageUrl?.startsWith("data:")
              ? _saint.imageUrl
              : _saint.imageUrl || "/placeholder.svg";

          return (
          <Card key={_saint.id} className="group hover:shadow-lg transition-all duration-300">
            <div className="relative h-32 overflow-hidden rounded-t-lg">
              <Image
                src={imgSrc}
                alt={_saint.name}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <h3 className="font-playfair text-lg font-bold text-white truncate">{_saint.name}</h3>
                <p className="text-white/80 text-xs truncate">slug: {_saint.slug}</p>
              </div>
            </div>

            <CardContent className="p-4">
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(_saint.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{_saint.country ?? "â€”"}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => onEdit(_saint)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(_saint.id)}
                  disabled={deletingId === _saint.id}
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
    </div>
  );
}

