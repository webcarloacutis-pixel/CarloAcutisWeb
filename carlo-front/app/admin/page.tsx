import { fetchPublicCollection } from "@/lib/public-collection"
import { apiUrl } from "@/lib/api-url"
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
  return fetchPublicCollection<Saint>(apiUrl("/saints"), {cache:"no-store"})
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
