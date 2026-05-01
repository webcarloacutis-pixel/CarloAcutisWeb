import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PrayersIntroduction } from "@/components/prayers-introduction";
import { PrayersSearch } from "@/components/prayers-search";
import { PrayersCategories } from "@/components/prayers-categories";
import { FeaturedPrayers } from "@/components/featured-prayers";
import { PrayersResults } from "@/components/prayers-results";
import { ScrollToResults } from "@/components/scroll-to-results";

export const dynamic = "force-dynamic";

type DbPrayer = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  approved: boolean;
  saintName: string | null;
  occasion: string | null;
  createdAt: string;
  updatedAt: string;
};

type Saint = {
  id: string;
  name: string;
  slug: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

async function getApprovedPrayers(): Promise<DbPrayer[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "";
  const res = await fetch(`${baseUrl}/prayers/approved`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Error cargando oraciones aprobadas: ${res.status}`);
  return res.json();
}

async function getSaintNames(): Promise<string[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "";
  const res = await fetch(`${baseUrl}/saints`, { cache: "no-store" });
  if (!res.ok) return [];
  const saints = (await res.json()) as Saint[];
  return Array.from(new Set((saints || []).map((s) => s.name).filter(Boolean))).sort();
}

export default async function OracionesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[]>;
}) {
  const approvedPrayers = await getApprovedPrayers();
  const saintsFromApi = await getSaintNames();

  const qRaw = (searchParams?.q ?? searchParams?.query ?? "") as string;
  const santoRaw = (searchParams?.santo ?? searchParams?.saint ?? "") as string;
  const ocasionRaw = (searchParams?.ocasion ?? searchParams?.occasion ?? "") as string;
  const categoriaRaw = (searchParams?.categoria ?? searchParams?.category ?? "") as string;

  const q = (qRaw || "").toString().trim();
  const santo = (santoRaw || "").toString().trim();
  const ocasion = (ocasionRaw || "").toString().trim();
  const categoria = (categoriaRaw || "").toString().trim();

  const categories = Array.from(
    new Set(approvedPrayers.map((p) => p.category).filter(Boolean))
  ) as string[];

  const occasions = Array.from(
    new Set(approvedPrayers.map((p) => p.occasion).filter(Boolean))
  ) as string[];

  const saintsFromPrayers = Array.from(
    new Set(approvedPrayers.map((p) => p.saintName).filter(Boolean))
  ) as string[];

  const saints = (saintsFromApi.length ? saintsFromApi : saintsFromPrayers).sort();

  let filtered = approvedPrayers as DbPrayer[];

  if (q) {
    const qq = q.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        (p.title ?? "").toLowerCase().includes(qq) ||
        (p.content ?? "").toLowerCase().includes(qq)
    );
  }

  if (santo) {
    const s = slugify(santo);
    filtered = filtered.filter((p) => slugify(p.saintName ?? "") === s);
  }

  if (ocasion) {
    const o = slugify(ocasion);
    filtered = filtered.filter((p) => slugify(p.occasion ?? "") === o);
  }

  if (categoria) {
    const c = slugify(categoria);
    filtered = filtered.filter((p) => {
      const pc = slugify(p.category ?? "");
      return pc.includes(c) || c.includes(pc); // match flexible
    });
  }

  // Destacadas: Ãºltimas 4 por updatedAt (dataset real)
  const featured = [...approvedPrayers]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <PrayersIntroduction />

        <PrayersSearch
          saints={saints}
          occasions={occasions}
          categories={categories}
          initialQuery={q}
          initialSaint={santo}
          initialOccasion={ocasion}
          initialCategory={categoria}
        />

        <PrayersCategories prayers={approvedPrayers} />

        <ScrollToResults />

        <FeaturedPrayers prayers={featured} />

        <div id="resultados">
          <PrayersResults prayers={filtered} />
        </div>
      </div>

      <Footer />
    </div>
  );
}

