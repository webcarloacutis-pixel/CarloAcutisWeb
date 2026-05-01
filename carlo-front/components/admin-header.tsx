"use client"

import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { LogOut, Shield, User } from "lucide-react"
import { useRouter } from "next/navigation"

export function AdminHeader() {
  const { logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <header className="bg-white border-b border-amber-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-amber-600" />
          <h1 className="text-xl font-playfair font-bold text-amber-900">Panel de Administración Sagrado</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-amber-700">
            <User className="w-4 h-4" />
            <span>Administrador</span>
          </div>

          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-50 bg-transparent"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </header>
  )
}
