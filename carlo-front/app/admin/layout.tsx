export const dynamic = "force-dynamic";
export const revalidate = 0;



import type React from "react"

import { ProtectedRoute } from "@/components/protected-route"
import { AuthProvider } from "@/lib/auth"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <ProtectedRoute>{children}</ProtectedRoute>
    </AuthProvider>
  )
}
