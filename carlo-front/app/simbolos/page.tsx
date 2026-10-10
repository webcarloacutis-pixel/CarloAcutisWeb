import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SymbolsIntroduction } from "@/components/symbols-introduction"
import { SymbolsGallery } from "@/components/symbols-gallery"
import { SymbolsCategories } from "@/components/symbols-categories"
import { T } from "@/components/t"

export default function SimbolosPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <div className="ornate-divider w-32 mx-auto mb-8"></div>
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-foreground mb-4"><T k="pageShell.symbolsTitle" /></h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            <T k="pageShell.symbolsDescription" />
          </p>
          <div className="ornate-divider w-32 mx-auto mt-8"></div>
        </div>

        <SymbolsIntroduction />
        <SymbolsCategories />
        <SymbolsGallery />
      </div>
      <Footer />
    </div>
  )
}
