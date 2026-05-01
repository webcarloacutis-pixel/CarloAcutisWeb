"use client";

import { useLanguage } from "@/contexts/language-context";
import { TranslatedText } from "@/components/translated-text";

/**
 * T = Texto traducible para UI
 * - Si language es "es" o "en": muestra t(k) normal (rápido, sin IA)
 * - Si es otro idioma: traduce con IA el texto base (t(k)) y cachea (via TranslatedText)
 */
export function T({ k, className }: { k: any; className?: string }) {
  const { language, t } = useLanguage();
  const base = String(t(k) ?? "");

  if (!base) return null;

  if (language === "es" || language === "en") {
    return <span className={className}>{base}</span>;
  }

  return <TranslatedText text={base} className={className} />;
}
