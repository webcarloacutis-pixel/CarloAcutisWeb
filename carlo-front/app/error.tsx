"use client"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="min-h-screen bg-background"><Header /><main className="max-w-3xl mx-auto px-4 py-16 space-y-6">
    <h1 className="font-playfair text-3xl">No se pudo cargar el contenido</h1>
    <p>Inténtalo de nuevo en unos momentos.</p><Button onClick={reset}>Volver a intentar</Button>
  </main><Footer /></div>
}
