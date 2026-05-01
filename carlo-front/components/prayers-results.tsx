import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Prayer = {
  id: string;
  title: string;
  content: string;
  category?: string | null;
  saintName?: string | null;
  occasion?: string | null;
};

export function PrayersResults({ prayers }: { prayers: Prayer[] }) {
  if (!prayers || prayers.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        No se encontraron oraciones con esos filtros.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prayers.map((p) => (
        <Card key={p.id} className="bg-white/70">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg">{p.title}</CardTitle>

            <div className="flex flex-wrap gap-2">
              {p.category ? <Badge variant="secondary">{p.category}</Badge> : null}
              {p.saintName ? <Badge variant="outline">{p.saintName}</Badge> : null}
              {p.occasion ? <Badge variant="outline">{p.occasion}</Badge> : null}
            </div>
          </CardHeader>

          <CardContent>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {p.content}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
