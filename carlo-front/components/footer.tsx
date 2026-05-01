"use client"

import { T } from "@/components/t";
import Link from "next/link"
import { Cross, Heart } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo y descripción */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Cross className="h-8 w-8 text-primary" />
              <span className="font-playfair text-xl font-bold text-foreground">Santos y Milagros</span>
            </Link>
            <p className="text-muted-foreground text-pretty max-w-md"><T k="footer.description" /></p>
          </div>

          {/* Enlaces rápidos */}
          <div>
            <h3 className="font-playfair font-semibold text-foreground mb-4"><T k="footer.explore" /></h3>
            <ul className="space-y-2">
              <li>
                <Link href="/santos" className="text-muted-foreground hover:text-primary transition-colors"><T k="footer.saints" /></Link>
              </li>
              <li>
                <Link href="/mapa" className="text-muted-foreground hover:text-primary transition-colors"><T k="footer.worldMap" /></Link>
              </li>
              <li>
                <Link href="/oraciones" className="text-muted-foreground hover:text-primary transition-colors"><T k="footer.prayers" /></Link>
              </li>
              <li>
                <Link href="/versiculos" className="text-muted-foreground hover:text-primary transition-colors"><T k="footer.verses" /></Link>
              </li>
            </ul>
          </div>

          {/* Recursos */}
          <div>
            <h3 className="font-playfair font-semibold text-foreground mb-4"><T k="footer.resources" /></h3>
            <ul className="space-y-2">
              <li>
                <Link href="/eucaristia" className="text-muted-foreground hover:text-primary transition-colors"><T k="footer.eucharist" /></Link>
              </li>
              <li>
                <Link href="/simbolos" className="text-muted-foreground hover:text-primary transition-colors"><T k="footer.symbols" /></Link>
              </li>
              <li>
                <Link href="/milagros" className="text-muted-foreground hover:text-primary transition-colors"><T k="footer.miracles" /></Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-muted-foreground flex items-center justify-center gap-2"><T k="footer.madeWith" /><Heart className="h-4 w-4 text-secondary" /><T k="footer.forGlory" /></p>
        </div>
      </div>
    </footer>
  )
}
