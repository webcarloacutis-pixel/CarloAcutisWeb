"use client"

import { T } from "@/components/t";
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, Cross } from "lucide-react"
import { LanguageSelector } from "@/components/language-selector"
import { useLanguage } from "@/contexts/language-context"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t } = useLanguage()

  const navigation = [
    { name: t("nav.saints"), href: "/santos" },
    { name: t("nav.miracles"), href: "/milagros" },
    { name: t("nav.prayers"), href: "/oraciones" },
    { name: t("nav.map"), href: "/mapa" },
    { name: t("nav.eucharist"), href: "/eucaristia" },
  ]

return (
  <header className="bg-card border-b border-border sticky top-0 z-40">
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="flex justify-between items-center h-14 sm:h-16">
        {/* Logo - responsive */}
        <Link href="/" className="flex items-center space-x-1.5 sm:space-x-2">
          <Cross className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <span className="font-playfair text-base sm:text-xl font-bold text-foreground truncate max-w-[140px] sm:max-w-none">
            <T k="brand.title" />
          </span>
        </Link>


          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-4 xl:space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-muted-foreground hover:text-primary transition-colors duration-200 font-medium text-sm xl:text-base whitespace-nowrap"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center space-x-4">
            <LanguageSelector />
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-1.5 sm:space-x-2">
            <LanguageSelector />
            <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1.5 sm:p-2">
              {isMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden">
            <div className="px-1 sm:px-2 pt-2 pb-3 space-y-1 border-t border-border">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-2 sm:px-3 py-2 text-sm sm:text-base text-muted-foreground hover:text-primary transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
