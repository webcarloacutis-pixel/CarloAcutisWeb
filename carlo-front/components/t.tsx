"use client";

import { useLanguage } from "@/contexts/language-context";
import { formatTranslation } from '@/lib/format-translation';

/** Fixed UI strings always come from the existing local language resources. */
export function T({ k, className, values }: { k: string; className?: string; values?: Record<string, string | number> }) {
  const { t } = useLanguage();
  const base = formatTranslation(String(t(k) ?? ""), values);

  if (!base) return null;

  return <span className={className}>{base}</span>;
}
