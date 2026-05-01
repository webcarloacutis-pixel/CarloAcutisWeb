export const dynamic = "force-dynamic";
export const revalidate = 0;


import { notFound } from "next/navigation";
import { SaintDetail } from "@/components/saint-detail";
import type { Saint } from "@/components/saint-detail";
import { apiUrl } from "@/lib/api-url";


type MiracleApi = {
  id: string;
  title: string;
  details: string | null;
  date: string | null;
  location: string | null;
  approved: boolean;
};

async function getMiraclesBySaintId(saintId: string) {
  const res = await fetch(
    apiUrl("/saints/" + encodeURIComponent(saintId) + "/miracles"),
    { cache: "no-store" }
  );

  if (!res.ok) return [];

  const api = (await res.json()) as MiracleApi[];

  return (Array.isArray(api) ? api : []).map((m) => ({
    id: m.id,
    title: m.title ?? "Milagro",
    description: m.details ?? "",
    date: m.date ?? null,
    location: m.location ?? null,
    verified: !!m.approved,
  }));
}

async function getSaint(slug: string): Promise<Saint> {
  const res = await fetch(apiUrl("/saints/" + encodeURIComponent(slug)), {
    cache: "no-store",
  });

  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Error al traer santo: ${res.status}`);

  const api = (await res.json()) as any;
  const miracles = api?.id ? await getMiraclesBySaintId(String(api.id)) : [];

  return {
    id: api.id ?? slug,
    slug: api.slug ?? slug,
    name: api.name ?? "Santo",
    country: api.country ?? null,
    title: api.title ?? null,
    feastDay: api.feastDay ?? null,
    birthYear: api.birthYear ?? null,
    canonizationYear: api.canonizationYear ?? null,
    biography: api.biography ?? null,
    image: api.imageUrl ?? api.image ?? null,
    patronOf: Array.isArray(api.patronOf) ? api.patronOf : [],
    symbols: Array.isArray(api.symbols) ? api.symbols : [],
    prayers: Array.isArray(api.prayers) ? api.prayers : [],
    miracles,
  };
}

export default async function SaintPage({ params }: { params: { slug: string } }) {
  const saint = await getSaint(params.slug);

  return (
    <div className="min-h-screen bg-background">
      <SaintDetail saint={saint} />
    </div>
  );
}
