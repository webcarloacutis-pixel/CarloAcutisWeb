"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function ScrollToResults() {
  const sp = useSearchParams();

  useEffect(() => {
    const s = sp?.toString() || "";
    if (!s) return;

    // Si hay cualquier filtro, bajamos a resultados
    const el = document.getElementById("resultados");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [sp]);

  return null;
}
