import { Suspense } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SaintMatcherIntroduction } from "@/components/saint-matcher-introduction"
import { SaintMatcherForm } from "@/components/saint-matcher-form"

export default function DescubreTuSantoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <SaintMatcherIntroduction />

          <Suspense fallback={<div className="text-center py-8">Cargando...</div>}>
            <SaintMatcherForm />
          </Suspense>
        </div>
      </div>
      <Footer />
    </div>
  )
}
