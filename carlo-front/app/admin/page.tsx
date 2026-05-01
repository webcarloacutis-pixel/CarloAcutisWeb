export const dynamic = "force-dynamic";

import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminHeader } from "@/components/admin-header";
import { AdminSaintsCreate } from "@/components/admin-saints-create";

type Saint = {
  id: string;
  slug: string;
  name: string;
  country?: string | null;
  createdAt: string;
  updatedAt: string;
};

async function getSaints(): Promise<Saint[]> {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL?.trim() || "");
  if (!baseUrl) throw new Error("NEXT_PUBLIC_API_URL no estÃ¡ definido en .env.local");

  const res = await fetch(`${baseUrl}/saints`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Error cargando santos: ${res.status}`);

  return res.json();
}

export default async function AdminPage() {
  const saints = await getSaints();

  return (
    <div className="min-h-screen bg-amber-50">
      <AdminHeader />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <AdminSaintsCreate />
        <AdminDashboard saints={saints} />
      </div>
    </div>
  );
}

