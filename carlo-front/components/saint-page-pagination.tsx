"use client"
import { Button } from "./ui/button"
import type { SaintPage } from "@/lib/saint-pages"
import { useLanguage } from '@/contexts/language-context'
import { T } from './t'

export function SaintPagePagination({ page, onCursor, label = "santos", disabled = false }: {
  page: Pick<SaintPage, "total" | "offset" | "hasMore" | "hasPrevious" | "nextCursor" | "previousCursor"> & { items: unknown[] }; onCursor: (cursor: string | null) => void; label?: string; disabled?: boolean
}) {
  const { t } = useLanguage()
  if (!page.hasMore && !page.hasPrevious) return null
  return <nav aria-label={t('catalog.pagination') + ': ' + (label === 'santos' ? t('nav.saints') : label === 'milagros' ? t('nav.miracles') : label === 'relatos de milagros' ? t('catalog.miracleAccounts') : label)} className="flex flex-wrap items-center justify-center gap-3 pt-4">
    <Button variant="outline" disabled={disabled || !page.hasPrevious} onClick={() => onCursor(page.previousCursor)}>{t('common.previous')}</Button>
    <span role="status" className="text-sm"><T k="catalog.range" values={{ from: page.offset + 1, to: page.offset + page.items.length, total: page.total }} /></span>
    <Button variant="outline" disabled={disabled || !page.hasMore} onClick={() => onCursor(page.nextCursor)}>{t('common.next')}</Button>
  </nav>
}
