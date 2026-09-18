"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, Globe } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { languages } from "@/lib/i18n"

export function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const { language, setLanguage, t } = useLanguage()
  const listId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!isOpen) return
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setIsOpen(false); buttonRef.current?.focus({preventScroll:true}) }
    }
    document.addEventListener("keydown", close)
    return () => document.removeEventListener("keydown", close)
  }, [isOpen])

  const currentLang = languages.find((lang) => lang.code === language)

  

return (
    <div className="relative">
      <Button
        ref={buttonRef}
        type="button"
        data-testid="site-language-selector"
        aria-label={`${t("selectLanguage")}: ${currentLang?.name || language}`}
        aria-expanded={isOpen}
        aria-controls={listId}
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-11 min-w-11 px-2 text-muted-foreground hover:text-primary"
      >
        <Globe className="hidden sm:block h-4 w-4" />
        <span className="text-lg">{currentLang?.flag}</span>
        <span className="hidden sm:inline font-medium">{currentLang?.name}</span>
        <ChevronDown className="hidden sm:block h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div id={listId} className="absolute right-0 mt-2 w-48 max-h-[calc(100dvh-var(--site-header-height)-0.5rem)] overflow-y-auto overscroll-contain bg-card border border-border rounded-lg shadow-lg z-20">
            <div className="py-2">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                {t("selectLanguage")}
              </div>

              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code)
                    setIsOpen(false)
                  }}
                  className={`w-full min-h-11 flex items-center space-x-3 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary transition-colors ${
                    language === lang.code ? "bg-accent text-accent-foreground" : "text-foreground"
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                  {language === lang.code && <span className="ml-auto text-primary">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
