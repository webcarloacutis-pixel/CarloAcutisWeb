"use client"
import type { ReactNode } from "react"
import type { CatalogKind } from "@/lib/catalog-localization"
import { useCatalogLocalization } from "@/lib/use-catalog-localization"
export function LocalCatalogRecord<T extends { id: string }>({kind,source,children}:{kind:CatalogKind;source:T;children:(content:T,state:{language:string;translated:string[];stale:string[]})=>ReactNode}) {
  const localized=useCatalogLocalization(kind,source)
  return children(localized.content,localized)
}
