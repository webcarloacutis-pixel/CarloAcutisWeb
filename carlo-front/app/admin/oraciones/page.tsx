export const dynamic = "force-dynamic";
export const revalidate = 0;


import { AdminPrayersList } from "@/components/admin-prayers-list"

export default function AdminPrayersPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminPrayersList />
      </div>
    </div>
  )
}
