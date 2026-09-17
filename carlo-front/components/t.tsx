"use client";

import { useLanguage } from "@/contexts/language-context";

/** Fixed UI strings always come from the existing local language resources. */
export function T({ k, className }: { k: string; className?: string }) {
  const { t } = useLanguage();
  const base = String(t(k) ?? "");

  if (!base) return null;

  return <span className={className}>{base}</span>;
}
