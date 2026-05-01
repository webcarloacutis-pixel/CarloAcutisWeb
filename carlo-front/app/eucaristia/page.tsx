import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { EucharistIntroduction } from "@/components/eucharist-introduction"
import { EucharistSteps } from "@/components/eucharist-steps"
import { EucharistMeaning } from "@/components/eucharist-meaning"
import { EucharistPrayers } from "@/components/eucharist-prayers"

export default function EucaristiaPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <div className="ornate-divider w-32 mx-auto mb-8"></div>
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-foreground mb-4">La Sagrada Eucaristía</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Descubre el sacramento más sagrado de la Iglesia Católica: su significado, celebración y el profundo
            misterio del Cuerpo y Sangre de Cristo.
          </p>
          <div className="ornate-divider w-32 mx-auto mt-8"></div>
        </div>

        <EucharistIntroduction />
        <EucharistSteps />
        <EucharistMeaning />
        <EucharistPrayers />
      </div>
      <Footer />
    </div>
  )
}
