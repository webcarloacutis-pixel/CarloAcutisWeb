"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useLanguage } from '@/contexts/language-context'
import { T } from './t'

export function useCatalogPage<T>(items: T[], size = 12) {
  const [state, setState] = useState({ items, index: 0 })
  const last = Math.max(0, Math.ceil(items.length / size) - 1)
  const index = state.items === items ? Math.min(state.index, last) : 0
  return {
    items: items.slice(index * size, (index + 1) * size), index, size, total: items.length,
    onPage: (next: number) => setState({ items, index: Math.max(0, Math.min(next, last)) }),
  }
}

export function CatalogPagination({ index, size, total, onPage, label }: {
  index: number; size: number; total: number; onPage: (index: number) => void; label: string
}) {
  const { t } = useLanguage()
  if (total <= size) return null
  return <nav aria-label={t('catalog.pagination') + ': ' + (label === 'santos' ? t('nav.saints') : label === 'milagros' ? t('nav.miracles') : label === 'relatos de milagros' ? t('catalog.miracleAccounts') : label)} className="flex flex-wrap items-center justify-center gap-3 pt-4">
    <Button variant="outline" disabled={index === 0} onClick={() => onPage(index - 1)}>{t('common.previous')}</Button>
    <span role="status" className="text-sm"><T k="catalog.range" values={{ from: index * size + 1, to: Math.min((index + 1) * size, total), total }} /></span>
    <Button variant="outline" disabled={(index + 1) * size >= total} onClick={() => onPage(index + 1)}>{t('common.next')}</Button>
  </nav>
}
