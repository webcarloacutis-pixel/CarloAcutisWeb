"use client";




import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Shield } from "lucide-react"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login, error: authError } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")



    const success = await login(password, email)

    if (success) {
      router.push("/admin")
    } else {
      setError("Credenciales incorrectas")
      setPassword("")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-amber-200">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl font-playfair text-amber-900">Portal Sagrado</CardTitle>
          <CardDescription className="text-amber-700">Acceso restringido al panel de administración</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="admin-email" className="text-sm font-medium text-amber-900">Email</label>
              <Input id="admin-email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-amber-900">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="pr-10 border-amber-200 focus:border-amber-400"
                  autoComplete="current-password"
                  maxLength={256}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  aria-label={showPassword ? "Ocultar clave" : "Mostrar clave"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-amber-600" />
                  )}
                </Button>
              </div>
            </div>

            {(error || authError) && (
              <Alert variant="destructive">
                <AlertDescription>{authError || error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white" disabled={loading}>
              {loading ? "Verificando..." : "Acceder al Sanctum"}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-amber-600">
            <p>🔒 Acceso protegido por autenticación sagrada</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
