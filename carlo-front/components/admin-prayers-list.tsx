"use client"
import { formatTranslation } from "@/lib/format-translation"
import { catalogErrorKey } from "@/lib/public-request"
import { useLanguage } from "@/contexts/language-context"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, Edit, Trash2 } from "lucide-react"
import {
  createPrayer,
  deletePrayer,
  getPrayers,
  updatePrayer,
  type PrayerApi,
} from "@/lib/prayers-utils"

export function AdminPrayersList() {
  const { t } = useLanguage()
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<PrayerApi[]>([])
  const [error, setError] = useState<string | null>(null)

  // create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [cTitle, setCTitle] = useState("")
  const [cCategory, setCCategory] = useState("")
  const [cContent, setCContent] = useState("")
  const [cApproved, setCApproved] = useState(false)
  const [creating, setCreating] = useState(false)

  // edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [eTitle, setETitle] = useState("")
  const [eCategory, setECategory] = useState("")
  const [eContent, setEContent] = useState("")
  const [eApproved, setEApproved] = useState(false)
  const [saving, setSaving] = useState(false)

  const reload = async () => {
    try {
      const data = await getPrayers()
      setError(null)
      setItems(data)
    } catch (e: any) {
      setError(catalogErrorKey(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active=true
    getPrayers().then(data=>{if(active){setItems(data);setError(null)}})
      .catch(error=>{if(active)setError(catalogErrorKey(error))})
      .finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((p) => {
      return (
        (p.title || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.content || "").toLowerCase().includes(q)
      )
    })
  }, [items, search])

  const approvedCount = useMemo(() => items.filter((p) => p.approved).length, [items])

  const openEdit = (p: PrayerApi) => {
    setEditingId(p.id)
    setETitle(p.title || "")
    setECategory(p.category || "")
    setEContent(p.content || "")
    setEApproved(!!p.approved)
    setEditOpen(true)
  }

  const onCreate = async () => {
    try {
      if (!cTitle.trim() || !cContent.trim()) {
        alert(t("supplemental.titleContentRequired"))
        return
      }
      setCreating(true)
      await createPrayer({
        title: cTitle.trim(),
        content: cContent.trim(),
        category: cCategory.trim() ? cCategory.trim() : null,
        approved: cApproved,
      })
      setCreateOpen(false)
      setCTitle("")
      setCCategory("")
      setCContent("")
      setCApproved(false)
      await reload()
    } catch (e: any) {
      alert(t(e?.message?.startsWith("catalog.") ? e.message : "supplemental.writeFailed"))
    } finally {
      setCreating(false)
    }
  }

  const onSave = async () => {
    if (!editingId) return
    try {
      if (!eTitle.trim() || !eContent.trim()) {
        alert(t("supplemental.titleContentRequired"))
        return
      }
      setSaving(true)
      await updatePrayer(editingId, {
        title: eTitle.trim(),
        content: eContent.trim(),
        category: eCategory.trim() ? eCategory.trim() : null,
        approved: eApproved,
      })
      setEditOpen(false)
      await reload()
    } catch (e: any) {
      alert(t(e?.message?.startsWith("catalog.") ? e.message : "supplemental.writeFailed"))
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string, title: string) => {
    if (!confirm(formatTranslation(t("supplemental.deleteNamed"), { name: title }))) return
    try {
      await deletePrayer(id)
      alert(t("supplemental.deleted"))
      await reload()
    } catch (e: any) {
      alert(t(e?.message?.startsWith("catalog.") ? e.message : "supplemental.writeFailed"))
    }
  }

  const toggleApproved = async (p: PrayerApi) => {
    try {
      await updatePrayer(p.id, { approved: !p.approved })
      await reload()
    } catch (e: any) {
      alert(t(e?.message?.startsWith("catalog.") ? e.message : "supplemental.writeFailed"))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-playfair text-3xl font-bold">{t("supplemental.managePrayers")}</h2>
          <p className="text-muted-foreground">
            {loading ? t("common.loading") : error ? "—" : formatTranslation(t("supplemental.prayerSummary"), { count: items.length, approved: approvedCount })}
          </p>
          {error ? <p role="alert" className="text-sm text-destructive mt-2">{t(error)}</p> : null}
        </div>

        <Button className="bg-primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("supplemental.newPrayer")}</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          className="pl-10"
          placeholder={t("supplemental.searchPrayers")} aria-label={t("supplemental.searchPrayers")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((p) => (
          <Card key={p.id} className="bg-white/40">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-lg">{p.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {p.category ? `${t("supplemental.category")}: ${p.category}` : t("supplemental.noCategory")} • {p.approved ? t("catalog.approved") : t("supplemental.notApproved")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant={p.approved ? "secondary" : "outline"} onClick={() => toggleApproved(p)}>
                    {p.approved ? t("supplemental.unapprove") : t("supplemental.approve")}
                  </Button>

                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                    <Edit className="h-3 w-3 mr-1" />
                    {t("common.edit")}</Button>

                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={formatTranslation(t("supplemental.deleteLabel"), { name: p.title })}
                    onClick={() => onDelete(p.id, p.title)}
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CREATE MODAL */}
      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-background p-6">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <div className="text-lg font-semibold">{t("supplemental.newPrayer")}</div>
                <p className="text-sm text-muted-foreground">{t("supplemental.prayerCreateHelp")}</p>
              </div>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                {t("common.close")}</Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium">{t("supplemental.title")}</label>
                <Input aria-label={t("supplemental.title")} value={cTitle} onChange={(e) => setCTitle(e.target.value)} disabled={creating} />
              </div>

              <div>
                <label className="text-sm font-medium">{t("supplemental.category")}</label>
                <Input aria-label={t("supplemental.category")} value={cCategory} onChange={(e) => setCCategory(e.target.value)} disabled={creating} />
              </div>

              <div>
                <label className="text-sm font-medium">{t("supplemental.content")}</label>
                <textarea
                  className="w-full min-h-[140px] rounded-md border bg-background p-3 text-sm"
                  aria-label={t("supplemental.content")} value={cContent}
                  onChange={(e) => setCContent(e.target.value)}
                  disabled={creating}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="create-approved" checked={cApproved} onCheckedChange={(v) => setCApproved(!!v)} />
                <label htmlFor="create-approved" className="text-sm font-medium">{t("catalog.approved")}</label>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                  {t("common.cancel")}</Button>
                <Button onClick={onCreate} disabled={creating}>
                  {creating ? t("supplemental.creating") : t("supplemental.create")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* EDIT MODAL */}
      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-background p-6">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <div className="text-lg font-semibold">{t("supplemental.editPrayer")}</div>
                <p className="text-sm text-muted-foreground">{t("supplemental.updateHelp")}</p>
              </div>
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                {t("common.close")}</Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium">{t("supplemental.title")}</label>
                <Input aria-label={t("supplemental.title")} value={eTitle} onChange={(e) => setETitle(e.target.value)} disabled={saving} />
              </div>

              <div>
                <label className="text-sm font-medium">{t("supplemental.category")}</label>
                <Input aria-label={t("supplemental.category")} value={eCategory} onChange={(e) => setECategory(e.target.value)} disabled={saving} />
              </div>

              <div>
                <label className="text-sm font-medium">{t("supplemental.content")}</label>
                <textarea
                  className="w-full min-h-[140px] rounded-md border bg-background p-3 text-sm"
                  aria-label={t("supplemental.content")} value={eContent}
                  onChange={(e) => setEContent(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="edit-approved" checked={eApproved} onCheckedChange={(v) => setEApproved(!!v)} />
                <label htmlFor="edit-approved" className="text-sm font-medium">{t("catalog.approved")}</label>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                  {t("common.cancel")}</Button>
                <Button onClick={onSave} disabled={saving}>
                  {saving ? t("supplemental.saving") : t("supplemental.saveChanges")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
