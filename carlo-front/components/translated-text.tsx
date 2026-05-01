"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import { postAiTranslate } from "@/lib/ai-client";

function hashTiny(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export function TranslatedText({ text, className }: { text: string; className?: string }) {
  const { language } = useLanguage();
  const [translated, setTranslated] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const key = useMemo(() => `tr:${language}:${hashTiny(text || "")}`, [language, text]);

  useEffect(() => {
    if (!text) return;
    if (language === "es") {
      setTranslated("");
      return;
    }

    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        setTranslated(cached);
        return;
      }
    } catch {}

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { translated } = await postAiTranslate({ text, targetLang: language });
        if (cancelled) return;
        setTranslated(translated);
        try { localStorage.setItem(key, translated); } catch {}
      } catch {
        if (!cancelled) setTranslated("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [language, text, key]);

  const out = language === "es" ? text : (translated || text);

  return (
    <span className={className}>
      {out}
      {loading ? <span className="opacity-60"> …</span> : null}
    </span>
  );
}
