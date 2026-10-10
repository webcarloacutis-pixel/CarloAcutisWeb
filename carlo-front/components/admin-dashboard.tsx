"use client";
import { useLanguage } from "@/contexts/language-context"

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminSaintsList } from "@/components/admin-saints-list";
import { AdminSaintsBrowser } from "./admin-saints-browser";
import { saintPageUrl } from "@/lib/saint-pages";
import { useSaintPage } from "@/lib/use-saint-page";
import { AdminSaintsModal } from "@/components/admin-saints-modal";
import { AdminMiraclesList } from "@/components/admin-miracles-list";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api-url";
import { AdminMiraclesStatsCard } from "@/components/admin-miracles-stats-card"
import { AdminPrayersStatsCard } from "@/components/admin-prayers-stats-card"
import { AdminPrayersList } from "@/components/admin-prayers-list";


type Saint = {
  id: string;
  slug: string;
  name: string;
  country?: string | null;
  createdAt: string;
  updatedAt: string;
};

type AdminDashboardProps = {
  saints?: Saint[]; // opcional para evitar crasheos si el padre no lo manda
};

type TabKey = "resumen" | "santos" | "milagros" | "oraciones" | "config";

export function AdminDashboard({ saints }: AdminDashboardProps) {
  const { t } = useLanguage()
  const [tab, setTab] = useState<TabKey>("resumen");



  const router = useRouter();
const [modalOpen, setModalOpen] = useState(false);
const [editError, setEditError] = useState<string | null>(null);
const [editing, setEditing] = useState<Partial<Saint> | undefined>(undefined);

function openCreate() {
  setEditing(undefined);
  setModalOpen(true);
}

async function openEdit(s: Saint) {
  try {
    setEditError(null);
    const response = await fetch(apiUrl("/saints/" + encodeURIComponent(s.id)), { cache: "no-store", credentials: "include" });
    if (!response.ok) throw new Error("supplemental.loadFailed");
    setEditing(await response.json());
    setModalOpen(true);
  } catch (error) { setEditError("supplemental.loadFailed"); }
}

function closeModal() {
  setModalOpen(false);
  setEditing(undefined);
  router.refresh();
}


  // ✅ blindaje: si llega undefined, no revienta el .filter
  const safeSaints = useMemo(() => (Array.isArray(saints) ? saints : []), [saints]);

  const totalPage = useSaintPage(apiUrl(saintPageUrl({query:"",continent:"",country:"",century:""}, "", 1)), saints === undefined);
  const totalSaints = saints === undefined ? totalPage.page?.total : safeSaints.length;

  return (
    <div className="space-y-6">
      {editError && <p role="alert">{t(editError)}</p>}
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border bg-white/40 p-2">
        <Button
          type="button"
          variant={tab === "resumen" ? "default" : "outline"}
          className={tab === "resumen" ? "" : "bg-transparent"}
          onClick={() => setTab("resumen")}
        >
          {t("supplemental.summary")}</Button>
        <Button
          type="button"
          variant={tab === "santos" ? "default" : "outline"}
          className={tab === "santos" ? "" : "bg-transparent"}
          onClick={() => setTab("santos")}
        >
          {t("nav.saints")}</Button>
        <Button
          type="button"
          variant={tab === "milagros" ? "default" : "outline"}
          className={tab === "milagros" ? "" : "bg-transparent"}
          onClick={() => setTab("milagros")}
        >
          {t("nav.miracles")}</Button>
        <Button
          type="button"
          variant={tab === "oraciones" ? "default" : "outline"}
          className={tab === "oraciones" ? "" : "bg-transparent"}
          onClick={() => setTab("oraciones")}
        >
          {t("nav.prayers")}</Button>

        <Button
          type="button"
          variant={tab === "config" ? "default" : "outline"}
          className={tab === "config" ? "" : "bg-transparent"}
          onClick={() => setTab("config")}
        >
          {t("supplemental.settings")}</Button>
      </div>

      {/* Contenido */}
      {tab === "resumen" && (
        <div className="grid gap-6 md:grid-cols-3">
          
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("nav.saints")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSaints ?? "—"}</div>
            {totalPage.error && <div role="alert"><p>{t(totalPage.error)}</p><Button onClick={totalPage.retry}>{t("content.retry")}</Button></div>}
            <p className="text-sm text-muted-foreground">{t("supplemental.manageHelp")}</p>
          </CardContent>
        </Card>

        <AdminMiraclesStatsCard />

        <AdminPrayersStatsCard />

          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold">{t("supplemental.quickActions")}</h3>
              <div className="mt-4 flex flex-col gap-2">
                <Button type="button" onClick={() => setTab("santos")}>
                  {t("supplemental.manageSaints")}
                </Button>
                
                <Button type="button" variant="outline" className="bg-transparent" onClick={() => setTab("oraciones")}>
                  {t("supplemental.managePrayers")}
                </Button>
<Button type="button" variant="outline" className="bg-transparent" onClick={() => setTab("milagros")}>
                  {t("supplemental.newMiracle")}
                </Button>
                <Button type="button" variant="outline" className="bg-transparent" onClick={() => setTab("config")}>
                  {t("supplemental.settings")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold">{t("supplemental.summary")}</h3>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>{t("supplemental.noActivity")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

{tab === "santos" && (
  <>
    {saints === undefined ? <AdminSaintsBrowser onAddNew={openCreate} onEdit={openEdit} /> : <AdminSaintsList saints={safeSaints} onAddNew={openCreate} onEdit={openEdit} />}
    <AdminSaintsModal open={modalOpen} onClose={closeModal} saint={editing} />
  </>
)}

      {tab === "milagros" && <AdminMiraclesList />}

      {tab === "oraciones" && <AdminPrayersList />}

      {tab === "config" && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">{t("supplemental.settings")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("supplemental.comingSoon")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
