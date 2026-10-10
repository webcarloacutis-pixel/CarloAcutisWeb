"use client"
import type { ReactNode } from "react"
import type { CatalogKind } from "@/lib/catalog-localization"
import { useCatalogLocalization } from "@/lib/use-catalog-localization"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "./ui/button"
export function LocalCatalogRecord<T extends { id: string }>({kind,source,children}:{kind:CatalogKind;source:T;children:(content:T,state:{language:string;translated:string[];stale:string[]})=>ReactNode}) {
  const localized=useCatalogLocalization(kind,source)
  const { t }=useLanguage()
  return <>{children(localized.content,localized)}{localized.failed && <div role="alert" className="mt-2 text-sm">
    <p>{t("content.translationUnavailable")}</p>
    {localized.canRetry && <Button variant="outline" onClick={localized.retry}>{t("content.retry")}</Button>}
  </div>}</>
}
