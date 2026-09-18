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
      if (event.key === "Escape") { setIsMenuOpen(false); menuButton.current?.focus({ preventScroll: true }) }
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
  <header className="h-14 sm:h-16 bg-card border-b border-border sticky top-0 z-40">
    <div className="h-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="flex justify-between gap-2 items-center h-full">
        {/* Logo - responsive */}
        <Link prefetch={false} href="/" className="min-w-0 min-h-11 flex items-center gap-1.5 sm:gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          <Cross className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
          <span className="font-playfair text-sm sm:text-xl font-bold text-foreground truncate">
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
                className="inline-flex items-center min-h-11 text-muted-foreground hover:text-primary transition-colors duration-200 font-medium text-sm whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="hidden xl:flex items-center space-x-4">
            <LanguageSelector />
          </div>

          {/* Mobile menu button */}
          <div className="xl:hidden shrink-0 flex items-center gap-1 sm:gap-2">
            <Link prefetch={false} href="/santos" aria-current={pathname === "/santos" ? "page" : undefined} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-primary rounded-md hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => setIsMenuOpen(false)}>
              {t("nav.saints")}
            </Link>
            <LanguageSelector />
            <Button ref={menuButton} variant="ghost" size="sm" aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={isMenuOpen} aria-controls="mobile-navigation" onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-11 w-11 p-2">
              {isMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav id="mobile-navigation" aria-label="Navegación móvil" className="xl:hidden absolute inset-x-0 top-full max-h-[calc(100dvh-var(--site-header-height))] overflow-y-auto bg-card border-b border-border shadow-lg">
            <div className="px-3 sm:px-4 py-2 border-t border-border">
              {navigation.map((item) => (
                <Link prefetch={false}
                  key={item.name}
                  href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                  className={`flex items-center min-h-11 px-2 sm:px-3 py-2 text-sm sm:text-base hover:bg-primary/10 hover:text-primary rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${item.href === "/santos" ? "text-primary font-semibold" : "text-muted-foreground"}`}
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
