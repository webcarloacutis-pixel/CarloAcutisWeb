"use client"
import { formatTranslation } from "@/lib/format-translation"
import { useLanguage } from "@/contexts/language-context"
import { SaintPagePagination } from "./saint-page-pagination"
import { miraclePageUrl } from "@/lib/miracle-pages"
import { useMiraclePage } from "@/lib/use-miracle-page"
import { useSaintNames } from "@/lib/use-saint-names"

import { apiUrl } from "@/lib/api-url"
import { mapApiToFormMiracle } from "@/lib/admin-utils"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, Edit, Trash2, Sparkles, MapPin, Calendar, Users, X } from "lucide-react"
import Link from "next/link"
import {
  createMiracle,
  deleteMiracle,
  updateMiracle,

} from "@/lib/admin-utils"

export function AdminMiraclesList() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)

  const [cursor, setCursor] = useState<string | null>(null)
  const names = useSaintNames()
  const saints = names.items
  const result = useMiraclePage(apiUrl(miraclePageUrl("/miracles/all", { query: searchTerm }, cursor)))
  const loading = result.loading
  const page = result.page || (loading ? result.previousPage : null)
  const filteredMiracles = (page?.items || []).map(miracle => ({ ...mapApiToFormMiracle(miracle), saintName: miracle.saintName, saintSlug: miracle.saintSlug, saintId: miracle.saintId }))

  // modal create
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createSaintId, setCreateSaintId] = useState<string>("")
  const [createVerified, setCreateVerified] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [mType, setMType] = useState("")
  const [mDate, setMDate] = useState("")
  const [mLocation, setMLocation] = useState("")
  const [witnessesText, setWitnessesText] = useState("")

  // modal edit
  const [editOpen, setEditOpen] = useState(false)
  const [editVerified, setEditVerified] = useState(false)
  const [editingId, setEditingId] = useState<string>("")
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editType, setEditType] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editLocation, setEditLocation] = useState("")
  const [editWitnessesText, setEditWitnessesText] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)



  function resetCreateForm() {
    setTitle("")
    setDescription("")
    setMType("")
    setMDate("")
    setMLocation("")
    setWitnessesText("")
  }

  async function reload() { setCursor(null); result.retry(); setError(null) }

  async function onCreate() {
    if (!createSaintId) {
      setError("supplemental.selectSaint")
      return
    }
    if (!title.trim()) {
      setError("supplemental.titleRequired")
      return
    }

    setCreating(true)
    try {
      setError(null)

      const witnessesArr = witnessesText
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)

      await createMiracle(createSaintId, {
        title: title.trim(),
        description: description.trim(),
        type: mType.trim(),
        date: mDate.trim(),
        location: mLocation.trim(),
        witnesses: witnessesArr,
        verified: createVerified,
      })

      setCreateOpen(false)
      await reload()
    } catch (e: any) {
      setError(e?.message?.startsWith("catalog.") ? e.message : "supplemental.writeFailed")
    } finally {
      setCreating(false)
    }
  }

    function openEdit(miracle: any) {
    setEditVerified(Boolean(miracle.approved ?? miracle.verified))
    setEditingId(String(miracle.id))
    setEditTitle(String(miracle.title || ""))
    setEditDescription(String(miracle.description || ""))
    setEditType(String(miracle.type || ""))
    setEditDate(String(miracle.date || ""))
    setEditLocation(String(miracle.location || ""))
    const w = Array.isArray(miracle.witnesses) ? miracle.witnesses : []
    setEditWitnessesText(w.join(", "))
    setEditOpen(true)
  }

  async function onSaveEdit() {
    if (!editingId) return
    if (!editTitle.trim()) {
      setError("supplemental.titleRequired")
      return
    }

    setSavingEdit(true)
    try {
      setError(null)

      const witnessesArr = editWitnessesText
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)

      await updateMiracle(editingId, {
        id: editingId,
        title: editTitle.trim(),
        description: editDescription.trim(),
        type: editType.trim(),
        date: editDate.trim(),
        location: editLocation.trim(),
        witnesses: witnessesArr,
        verified: editVerified,
      } as any)

      setEditOpen(false)
      await reload()
    } catch (e: any) {
      setError(e?.message?.startsWith("catalog.") ? e.message : "supplemental.writeFailed")
    } finally {
      setSavingEdit(false)
    }
  }

async function onDelete(miracleId: string, miracleTitle: string) {
    if (!confirm(formatTranslation(t("supplemental.deleteNamed"), { name: miracleTitle }))) return
    try {
      await deleteMiracle(miracleId)
      alert(t("supplemental.deleted"))
      await reload()
    } catch (e: any) {
      alert(t(e?.message?.startsWith("catalog.") ? e.message : "supplemental.writeFailed"))
    }
  }
  const toggleApproved = async (miracleId: string, current: boolean) => {
    try {
      // updateMiracle ya deberÃ­a mapear verified->approved, pero mandamos approved directo por seguridad
      await updateMiracle(miracleId, { approved: !current, verified: !current } as any)
      await reload()
    } catch (e: any) {
      alert(t(e?.message?.startsWith("catalog.") ? e.message : "supplemental.writeFailed"))
    }
  }



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-playfair text-3xl font-bold">{t("supplemental.manageMiracles")}</h2>
          <p className="text-muted-foreground">{t("supplemental.manageHelp")}</p>
        </div>
<Button className="bg-primary" onClick={() => {setCreateSaintId(saints[0]?.id || ""); resetCreateForm(); setCreateVerified(false); setCreateOpen(true)}}>
          <Plus className="h-4 w-4 mr-2" />
          {t("supplemental.newMiracle")}</Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-0 basis-48 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t("catalog.searchMiracles")}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCursor(null) }}
            maxLength={200}
            aria-label={t("catalog.searchMiracles")}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{page ? formatTranslation(t("catalog.miraclesCount"), { count: page.total }) : "—"}</Badge>
          <Badge variant="outline">{page ? formatTranslation(t("catalog.approvedCount"), { count: page.metadata.approvedTotal }) : "—"}</Badge>
        </div>
      </div>

      {loading ? <p role="status" className="text-muted-foreground">{t("catalog.miraclesLoading")}</p> : null}
      {error ? <p role="alert" className="text-destructive whitespace-pre-wrap">{t(error)}</p> : null}
      {(result.error || names.error) && <div role="alert"><p>{t(result.error || names.error || "catalog.failed")}</p><Button onClick={() => { result.retry(); if(names.error) names.retry() }}>{t("content.retry")}</Button>{cursor && <Button onClick={() => setCursor(null)}>{t("catalog.firstPage")}</Button>}</div>}

      <div className="space-y-4">
        {filteredMiracles.map((miracle) => (
          <Card key={miracle.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="font-playfair text-lg mb-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-secondary" />
                    {miracle.title}
                  </CardTitle>

                  <p className="text-sm text-muted-foreground mb-2">
                    {t("supplemental.saint")}{" "}
                    <Link href={`/santos/${miracle.saintSlug}`} className="text-primary hover:underline">
                      {miracle.saintName}
                    </Link>
                  </p>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {miracle.date ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{miracle.date}</span>
                      </div>
                    ) : null}

                    {miracle.location ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{miracle.location}</span>
                      </div>
                    ) : null}

                    {miracle.witnesses && miracle.witnesses.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{formatTranslation(t("catalog.witnessCount"), { count: miracle.witnesses.length })}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Edit lo hacemos en el siguiente paso */}
                  <Button
                    size="sm"
                    variant={(miracle.approved ?? miracle.verified) ? "secondary" : "outline"}
                    onClick={async () => {
                      try {
                        await toggleApproved(String(miracle.id), !!(miracle.approved ?? miracle.verified));
                      } catch (e: any) {
                        alert(t(e?.message?.startsWith("catalog.") ? e.message : "supplemental.writeFailed"));
                      }
                    }}
                  >
                    {(miracle.approved ?? miracle.verified) ? t("supplemental.unapprove") : t("supplemental.approve")}
                  </Button>


                  <Button size="sm" variant="outline" onClick={() => openEdit(miracle)}>
                    <Edit className="h-3 w-3 mr-1" />
                    {t("common.edit")}</Button>

                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={formatTranslation(t("supplemental.deleteLabel"), { name: miracle.title })}
                    onClick={() => onDelete(String(miracle.id), String(miracle.title || ""))}
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground line-clamp-2">{miracle.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {page && <SaintPagePagination page={page} onCursor={setCursor} label={t("supplemental.adminMiracles")} disabled={loading} />}
      {editOpen ? (
        <div role="dialog" aria-modal="true" aria-label={t("supplemental.editMiracle")} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{t("supplemental.editMiracle")}</div>
                <div className="text-sm text-muted-foreground">{t("supplemental.updateHelp")}</div>
              </div>
              <Button aria-label={t("common.close")} variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && <p role="alert" className="text-destructive whitespace-pre-wrap">{t(error)}</p>}
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t("supplemental.title")}</label>
                <Input aria-label={t("supplemental.title")} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} disabled={savingEdit} />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">{t("supplemental.description")}</label>
                <textarea
                  aria-label={t("supplemental.description")} value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={savingEdit}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t("supplemental.type")}</label>
                  <Input aria-label={t("supplemental.type")} value={editType} onChange={(e) => setEditType(e.target.value)} disabled={savingEdit} />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t("supplemental.date")}</label>
                  <Input aria-label={t("supplemental.date")} value={editDate} onChange={(e) => setEditDate(e.target.value)} disabled={savingEdit} />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm font-medium">{t("supplemental.location")}</label>
                  <Input aria-label={t("supplemental.location")} value={editLocation} onChange={(e) => setEditLocation(e.target.value)} disabled={savingEdit} />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm font-medium">{t("supplemental.witnessComma")}</label>
                  <Input
                    aria-label={t("supplemental.witnessComma")} value={editWitnessesText}
                    onChange={(e) => setEditWitnessesText(e.target.value)}
                    disabled={savingEdit}
                  />
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-verified"
                    checked={editVerified}
                    onCheckedChange={(v) => setEditVerified(!!v)}
                    disabled={savingEdit}
                  />
                  <label htmlFor="edit-verified" className="text-sm font-medium">
                    {t("catalog.approved")}</label>
                </div>
</div>
              </div>

              <div className="flex gap-2">
                <Button onClick={onSaveEdit} disabled={savingEdit}>
                  {savingEdit ? t("supplemental.saving") : t("supplemental.saveChanges")}
                </Button>
                <Button aria-label={t("common.close")} variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>
                  {t("common.cancel")}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}



      {createOpen ? (
        <div role="dialog" aria-modal="true" aria-label={t("supplemental.newMiracle")} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{t("supplemental.newMiracle")}</div>
                <div className="text-sm text-muted-foreground">
                  {t("supplemental.miracleHelp")}
                </div>
              </div>
              <Button aria-label={t("common.close")} variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && <p role="alert" className="text-destructive whitespace-pre-wrap">{t(error)}</p>}
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t("supplemental.saint")}</label>
                <select aria-label={t("supplemental.saint")}
                  value={createSaintId}
                  onChange={(e) => setCreateSaintId(e.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  disabled={creating}
                >
                  {saints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">{t("supplemental.title")}</label>
                <Input aria-label={t("supplemental.title")} value={title} onChange={(e) => setTitle(e.target.value)} disabled={creating} />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">{t("supplemental.description")}</label>
                <textarea
                  aria-label={t("supplemental.description")} value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={creating}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t("supplemental.type")}</label>
                  <Input aria-label={t("supplemental.type")} value={mType} onChange={(e) => setMType(e.target.value)} disabled={creating} />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t("supplemental.date")}</label>
                  <Input aria-label={t("supplemental.date")} value={mDate} onChange={(e) => setMDate(e.target.value)} disabled={creating} />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm font-medium">{t("supplemental.location")}</label>
                  <Input aria-label={t("supplemental.location")} value={mLocation} onChange={(e) => setMLocation(e.target.value)} disabled={creating} />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm font-medium">{t("supplemental.witnessComma")}</label>
                  <Input aria-label={t("supplemental.witnessComma")} value={witnessesText} onChange={(e) => setWitnessesText(e.target.value)} disabled={creating} />
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="create-verified"
                    checked={createVerified}
                    onCheckedChange={(v) => setCreateVerified(!!v)}
                    disabled={creating}
                  />
                  <label htmlFor="create-verified" className="text-sm font-medium">
                    {t("catalog.approved")}</label>
                </div>
</div>
              </div>

              <div className="flex gap-2">
                <Button onClick={onCreate} disabled={creating}>
                  {creating ? t("supplemental.creating") : t("supplemental.create")}
                </Button>
                <Button aria-label={t("common.close")} variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                  {t("common.cancel")}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
