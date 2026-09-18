import { catalogWriteError } from "./catalog-write-error"
import { fetchPublicCollection } from "./public-collection"
import { apiUrl } from "./api-url"


export type SaintFormData = {
  id?: string;
  slug?: string;
  name: string;

  country?: string | null;
  title?: string | null;
  feastDay?: string | null;
  imageUrl?: string | null;
  biography?: string | null;

  [key: string]: unknown;
};

export function generateSlug(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function validateSaintData(saint: SaintFormData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const name = String(saint?.name ?? "").trim();
  const slug = String(saint?.slug ?? "").trim();

  if (!name) errors.push("El nombre es requerido.");
  if (!slug && !name) errors.push("El slug es requerido.");

  return { isValid: errors.length === 0, errors };
}

function getBaseUrl() { return apiUrl("/").replace(/\/+$/, "") }

export async function saveSaint(
  saint: SaintFormData
): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    const validation = validateSaintData(saint);
    if (!validation.isValid) {
      return { success: false, message: validation.errors.join(" ") };
    }

    const baseUrl = getBaseUrl();
    const isEdit = !!saint.id;

    const slug = String(saint.slug ?? "").trim() || generateSlug(String(saint.name ?? "").trim());

    const payload = {
      slug,
      name: String(saint.name ?? "").trim(),
      country: String(saint.country ?? "").trim() || null,
      title: String(saint.title ?? "").trim() || null,
      feastDay: String(saint.feastDay ?? "").trim() || null,
      imageUrl: String(saint.imageUrl ?? "").trim() || null,
      biography: String(saint.biography ?? "").trim() || null,
    };

    const url = isEdit ? `${baseUrl}/saints/${saint.id}` : `${baseUrl}/saints`;
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!res.ok) {
      return { success: false, message: await catalogWriteError(res, `Error guardando santo (${res.status}).`) };
    }

    const data = (await res.json().catch(() => null)) as any;
    window.dispatchEvent(new Event("catalog:saints-changed"));
    return { success: true, message: "Santo guardado.", id: data?.id };
  } catch (e: any) {
    return { success: false, message: e?.message ? String(e.message) : "Error guardando santo." };
  }
}

export async function deleteSaint(saintId: string): Promise<{ success: boolean; message: string }> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/saints/${saintId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      return { success: false, message: `Error eliminando santo (${res.status}).` };
    }

    return { success: true, message: "Santo eliminado." };
  } catch (e: any) {
    return { success: false, message: e?.message ? String(e.message) : "Error eliminando santo." };
  }
}

// ===============================
// âœ… MIRACLES API (Backend Acutis)
// ===============================

export type MiracleFormData = {
  id?: string;
  saintId?: string;
  title: string;
  description?: string; // tu UI
  details?: string;     // backend
  type?: string;
  date?: string;
  location?: string;
  witnesses?: string[]; // tu UI
  approved?: boolean;   // backend
  verified?: boolean;   // tu UI (compat)
};

export type MiracleApi = {
  id: string;
  saintId: string;
  title: string;
  details: string | null;
  type: string | null;
  date: string | null;
  location: string | null;
  witnesses: string | null;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
};

export function mapFormToApiMiracle(input: MiracleFormData) {
  const witnessesValue =
    Array.isArray(input.witnesses) ? input.witnesses.filter(Boolean).join(", ") : null;

  return {
    title: String(input.title ?? "").trim(),
    details: (input.details ?? input.description ?? null) ? String(input.details ?? input.description).trim() : null,
    type: input.type ? String(input.type).trim() : null,
    date: input.date ? String(input.date).trim() : null,
    location: input.location ? String(input.location).trim() : null,
    witnesses: witnessesValue,
    approved: typeof input.approved === "boolean" ? input.approved : !!input.verified,
  };
}

export function mapApiToFormMiracle(input: MiracleApi): MiracleFormData {
  return {
    id: input.id,
    saintId: input.saintId,
    title: input.title,
    description: input.details ?? "",
    verified: input.approved,
    type: input.type ?? "",
    date: input.date ?? "",
    location: input.location ?? "",
    witnesses: input.witnesses ? input.witnesses.split(",").map(s => s.trim()).filter(Boolean) : [],
  };
}

export async function getMiraclesBySaintId(saintId: string): Promise<MiracleFormData[]> {
  const baseUrl = getBaseUrl();
  const data = await fetchPublicCollection<MiracleApi>(`${baseUrl}/saints/${encodeURIComponent(saintId)}/miracles/all`, {cache:"no-store", credentials:"include"})
  return data.map(mapApiToFormMiracle);
}

export async function createMiracle(saintId: string, formData: MiracleFormData): Promise<MiracleFormData> {
  const baseUrl = getBaseUrl();
  const payload = mapFormToApiMiracle(formData);

  const res = await fetch(`${baseUrl}/saints/${saintId}/miracles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });

    if (!res.ok) throw new Error(await catalogWriteError(res, `No se pudo crear el milagro (${res.status}).`));
  const created = (await res.json()) as MiracleApi;
  return mapApiToFormMiracle(created);
}

export async function updateMiracle(
  miracleId: string,
  formData: MiracleFormData
): Promise<MiracleFormData> {
  const baseUrl = getBaseUrl();

  // âœ… IMPORTANTE:
  // En PATCH solo enviamos campos definidos.
  // Esto evita que un toggle de approved/verified sobre-escriba title/details con "".
  const payload: any = {};

  if (formData.title !== undefined) payload.title = formData.title;
  if (formData.type !== undefined) payload.type = formData.type ?? null;
  if (formData.date !== undefined) payload.date = formData.date ?? null;
  if (formData.location !== undefined) payload.location = formData.location ?? null;

  // UI: description | Backend: details
  const details = (formData.details ?? formData.description);
  if (details !== undefined) payload.details = details ?? null;

  // UI: witnesses string[] | Backend: witnesses string
  if (formData.witnesses !== undefined) {
    payload.witnesses = Array.isArray(formData.witnesses) ? formData.witnesses.join(", ") : null;
  }

  // approved (backend) y verified (UI compat)
  if (typeof formData.approved === "boolean") payload.approved = formData.approved;
  if (typeof formData.verified === "boolean" && payload.approved === undefined) payload.approved = formData.verified;

  const res = await fetch(`${baseUrl}/miracles/${miracleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

    if (!res.ok) throw new Error(`No se pudo actualizar el milagro (${res.status}).`);

  return mapApiToFormMiracle(await res.json());
}

export async function deleteMiracle(miracleId: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/miracles/${miracleId}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error(`No se pudo eliminar el milagro (${res.status}).`);
}

// ===============================
// âœ… PRAYERS API (Backend Acutis)
// ===============================

export type PrayerFormData = {
  id?: string
  title: string
  content: string
  category?: string | null
  approved?: boolean
}

type PrayerApi = {
  id: string
  title: string
  content: string
  category: string | null
  approved: boolean
  createdAt: string
  updatedAt: string
}

export async function getPrayers(): Promise<PrayerApi[]> {
  return fetchPublicCollection<PrayerApi>(apiUrl("/prayers/all"),{cache:"no-store",credentials:"include"})
}

export async function getApprovedPrayers(): Promise<PrayerApi[]> {
  return fetchPublicCollection<PrayerApi>(apiUrl("/prayers/approved"),{cache:"no-store",credentials:"include"})
}

export async function createPrayer(formData: PrayerFormData): Promise<PrayerApi> {
  const baseUrl = getBaseUrl()
  const res = await fetch(`${baseUrl}/prayers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(formData),
  })
  if (!res.ok) {
    throw new Error(`Error creando oraciÃ³n (${res.status}).`)
  }
  return res.json()
}

export async function updatePrayer(prayerId: string, formData: Partial<PrayerFormData>): Promise<PrayerApi> {
  const baseUrl = getBaseUrl()
  const res = await fetch(`${baseUrl}/prayers/${prayerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(formData),
  })
  if (!res.ok) {
    throw new Error(`Error editando oraciÃ³n (${res.status}).`)
  }
  return res.json()
}

export async function deletePrayer(prayerId: string): Promise<void> {
  const baseUrl = getBaseUrl()
  const res = await fetch(`${baseUrl}/prayers/${prayerId}`, {
    method: "DELETE",
    credentials: "include",
  })
  if (!res.ok) {
    throw new Error(`Error eliminando oraciÃ³n (${res.status}).`)
  }
}
