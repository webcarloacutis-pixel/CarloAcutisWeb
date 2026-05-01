import { T } from "@/components/t";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SaintsList } from "@/components/saints-list";
import { SaintsFilters } from "@/components/saints-filters";


export const dynamic = "force-dynamic";

export type Saint = {
  id: string;
  slug: string;
  name: string;

  country?: string | null;

  // Campos nuevos del backend
  title?: string | null;
  feastDay?: string | null;
  imageUrl?: string | null;
  biography?: string | null;

  createdAt: string;
  updatedAt: string;
};

async function getSaints(): Promise<Saint[]> {
  const baseUrl = '';

  const res = await fetch(`${baseUrl}/saints`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Error al traer santos: ${res.status}`);

  return res.json();
}

export default async function SaintsPage() {
  const saints = await getSaints();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <div className="ornate-divider w-32 mx-auto mb-8"></div>
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-foreground mb-4">
            <T k="saints.title" />
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Descubre las historias extraordinarias de hombres y mujeres que dedicaron sus vidas a Dios y se convirtieron
            en ejemplos de santidad para toda la humanidad.
          </p>
          <div className="ornate-divider w-32 mx-auto mt-8"></div>
        </div>

        <SaintsFilters />
        <SaintsList saints={saints} />
      </div>
      <Footer />
    </div>
  );
}

