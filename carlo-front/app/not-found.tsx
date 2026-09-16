import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
export default function NotFound() {
  return <div className="min-h-screen bg-background"><Header /><main className="max-w-3xl mx-auto px-4 py-16 space-y-6">
    <h1 className="font-playfair text-3xl">Contenido no encontrado</h1><p>No encontramos la página que solicitaste.</p>
    <Button asChild><Link prefetch={false} href="/santos">Volver al catálogo de santos</Link></Button>
  </main><Footer /></div>
}
