export const dynamic = "force-dynamic";

import { AdminCatalog } from "@/components/admin-catalog";
import { AdminHeader } from "@/components/admin-header";
import { AdminSaintsCreate } from "@/components/admin-saints-create";

export default async function AdminPage() {

  return (
    <div className="min-h-screen bg-amber-50">
      <AdminHeader />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <AdminSaintsCreate />
        <AdminCatalog />
      </div>
    </div>
  );
}
