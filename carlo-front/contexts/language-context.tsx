"use client";

import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { translations } from "@/lib/translations";

export type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const MAP: Record<string, string> = {
  us: "en",
  cn: "zh",
  sa: "ar",
  br: "pt",
  jp: "ja",
  kr: "ko",
};

function normalizeLang(input?: string | null) {
  const saved = input?.toLowerCase()?.trim();
  return MAP[saved ?? ""] || saved || "es";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>("es");

  useEffect(() => {
  try {
    const saved =
      localStorage.getItem("language") ||
      localStorage.getItem("lang") ||
      localStorage.getItem("locale");

    const normalized = normalizeLang(saved);
    setLanguageState(normalized);

    const raw = (saved ?? "").toLowerCase().trim();
    if (raw && normalized !== raw) {
      localStorage.setItem("language", normalized);
    }
  } catch {
    // ignore
  }
}, []);


  useEffect(() => {
    const onStorage = () => {
      try {
        const saved = localStorage.getItem("language");
        const normalized = normalizeLang(saved);
        if (normalized !== language) setLanguageState(normalized);
        const raw = (saved ?? "").toLowerCase().trim();
        if (raw && normalized !== raw) localStorage.setItem("language", normalized);
      } catch {
        // ignore
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [language]);


  const setLanguage = (lang: string) => {
    const normalized = normalizeLang(lang);
    setLanguageState(normalized);
    try {
      localStorage.setItem("language", normalized);
    } catch {
      // ignore
    }
  };

  const value = useMemo<LanguageContextType>(() => {
    const defaultLanguage = "es";

    const t = (key: string) => {
      const currentDict = translations[language] || translations[defaultLanguage] || {};
      const fallbackDict = translations[defaultLanguage] || {};
      return currentDict[key] ?? fallbackDict[key] ?? key;
    };

    return { language, setLanguage, t };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage debe usarse dentro de <LanguageProvider>");
  return ctx;
}
