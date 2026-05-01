import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MiraclesList } from "@/components/miracles-list"

export default function MiraclesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <div className="ornate-divider w-32 mx-auto mb-8"></div>
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-foreground mb-4">Milagros de los Santos</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Testimonios extraordinarios del poder divino manifestado a través de la intercesión de los santos a lo largo
            de la historia.
          </p>
          <div className="ornate-divider w-32 mx-auto mt-8"></div>
        </div>

        <MiraclesList />
      </div>
      <Footer />
    </div>
  )
}
