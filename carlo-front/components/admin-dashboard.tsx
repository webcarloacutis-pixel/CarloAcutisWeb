"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminSaintsList } from "@/components/admin-saints-list";
import { AdminSaintsModal } from "@/components/admin-saints-modal";
import { AdminMiraclesList } from "@/components/admin-miracles-list";
import { useRouter } from "next/navigation";
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
  const [tab, setTab] = useState<TabKey>("resumen");



  const router = useRouter();
const [modalOpen, setModalOpen] = useState(false);
const [editing, setEditing] = useState<Partial<Saint> | undefined>(undefined);

function openCreate() {
  setEditing(undefined);
  setModalOpen(true);
}

function openEdit(s: Saint) {
  setEditing(s);
  setModalOpen(true);
}

function closeModal() {
  setModalOpen(false);
  setEditing(undefined);
  router.refresh();
}


  // ✅ blindaje: si llega undefined, no revienta el .filter
  const safeSaints = useMemo(() => (Array.isArray(saints) ? saints : []), [saints]);

  const totalSaints = safeSaints.length;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center justify-center gap-2 rounded-lg border bg-white/40 p-2">
        <Button
          type="button"
          variant={tab === "resumen" ? "default" : "outline"}
          className={tab === "resumen" ? "" : "bg-transparent"}
          onClick={() => setTab("resumen")}
        >
          Resumen
        </Button>
        <Button
          type="button"
          variant={tab === "santos" ? "default" : "outline"}
          className={tab === "santos" ? "" : "bg-transparent"}
          onClick={() => setTab("santos")}
        >
          Santos
        </Button>
        <Button
          type="button"
          variant={tab === "milagros" ? "default" : "outline"}
          className={tab === "milagros" ? "" : "bg-transparent"}
          onClick={() => setTab("milagros")}
        >
          Milagros
        </Button>
        <Button
          type="button"
          variant={tab === "oraciones" ? "default" : "outline"}
          className={tab === "oraciones" ? "" : "bg-transparent"}
          onClick={() => setTab("oraciones")}
        >
          Oraciones
        </Button>

        <Button
          type="button"
          variant={tab === "config" ? "default" : "outline"}
          className={tab === "config" ? "" : "bg-transparent"}
          onClick={() => setTab("config")}
        >
          Configuración
        </Button>
      </div>

      {/* Contenido */}
      {tab === "resumen" && (
        <div className="grid gap-6 md:grid-cols-3">
          
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Santos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSaints}</div>
            <p className="text-sm text-muted-foreground">Santos documentados</p>
          </CardContent>
        </Card>

        <AdminMiraclesStatsCard />

        <AdminPrayersStatsCard />

          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold">Acciones Rápidas</h3>
              <div className="mt-4 flex flex-col gap-2">
                <Button type="button" onClick={() => setTab("santos")}>
                  + Agregar / Gestionar Santos
                </Button>
                
                <Button type="button" variant="outline" className="bg-transparent" onClick={() => setTab("oraciones")}>
                  + Agregar / Gestionar Oraciones
                </Button>
<Button type="button" variant="outline" className="bg-transparent" onClick={() => setTab("milagros")}>
                  Registrar Milagro (próximo)
                </Button>
                <Button type="button" variant="outline" className="bg-transparent" onClick={() => setTab("config")}>
                  Configuración (próximo)
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold">Actividad Reciente</h3>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>— (próximo)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

{tab === "santos" && (
  <>
    <AdminSaintsList saints={safeSaints} onAddNew={openCreate} onEdit={openEdit} />
    <AdminSaintsModal open={modalOpen} onClose={closeModal} saint={editing} />
  </>
)}

      {tab === "milagros" && <AdminMiraclesList />}

      {tab === "oraciones" && <AdminPrayersList />}

      {tab === "config" && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">Configuración</h3>
            <p className="mt-2 text-sm text-muted-foreground">Aquí irá la configuración del admin después.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
