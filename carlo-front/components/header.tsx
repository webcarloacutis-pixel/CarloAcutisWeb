"use client"

import { T } from "@/components/t";
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, Cross } from "lucide-react"
import { LanguageSelector } from "@/components/language-selector"
import { useLanguage } from "@/contexts/language-context"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t } = useLanguage()
  const pathname = usePathname()
  const menuButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!isMenuOpen) return
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setIsMenuOpen(false); menuButton.current?.focus() }
    }
    document.addEventListener("keydown", close)
    return () => document.removeEventListener("keydown", close)
  }, [isMenuOpen])

  const navigation = [
    { name: t("nav.saints"), href: "/santos" },
    { name: t("nav.miracles"), href: "/milagros" },
    { name: t("nav.prayers"), href: "/oraciones" },
    { name: t("nav.map"), href: "/mapa" },
    { name: t("nav.eucharist"), href: "/eucaristia" },
    { name: t("footer.verses"), href: "/versiculos" },
    { name: t("footer.symbols"), href: "/simbolos" },
  ]

return (
  <header className="bg-card border-b border-border sticky top-0 z-40">
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="flex justify-between items-center h-14 sm:h-16">
        {/* Logo - responsive */}
        <Link prefetch={false} href="/" className="flex items-center space-x-1.5 sm:space-x-2">
          <Cross className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <span className="font-playfair text-base sm:text-xl font-bold text-foreground truncate max-w-[140px] sm:max-w-none">
            <T k="brand.title" />
          </span>
        </Link>


          {/* Desktop Navigation */}
          <nav aria-label="Navegación principal" className="hidden xl:flex space-x-3 xl:space-x-4">
            {navigation.map((item) => (
              <Link prefetch={false}
                key={item.name}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="text-muted-foreground hover:text-primary transition-colors duration-200 font-medium text-sm whitespace-nowrap"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="hidden xl:flex items-center space-x-4">
            <LanguageSelector />
          </div>

          {/* Mobile menu button */}
          <div className="xl:hidden flex items-center space-x-1.5 sm:space-x-2">
            <LanguageSelector />
            <Button ref={menuButton} variant="ghost" size="sm" aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={isMenuOpen} aria-controls="mobile-navigation" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1.5 sm:p-2">
              {isMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav id="mobile-navigation" aria-label="Navegación móvil" className="xl:hidden">
            <div className="px-1 sm:px-2 pt-2 pb-3 space-y-1 border-t border-border">
              {navigation.map((item) => (
                <Link prefetch={false}
                  key={item.name}
                  href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                  className="block px-2 sm:px-3 py-2 text-sm sm:text-base text-muted-foreground hover:text-primary transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
