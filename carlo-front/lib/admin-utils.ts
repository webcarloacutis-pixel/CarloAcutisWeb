
function withAdminKey(headers: Record<string, string>) {
  const k = process.env.NEXT_PUBLIC_ADMIN_KEY;
  return k ? { ...headers, "x-admin-key": k } : headers;
}

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

function getBaseUrl() {
  const env = process.env.NEXT_PUBLIC_API_URL;
  const url = (env && String(env).trim()) ? String(env).trim() : "http://localhost:3001";
  return url.replace(/\/+$/, "");
}

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
      headers: withAdminKey({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { success: false, message: `Error guardando santo (${res.status}). ${txt}` };
    }

    const data = (await res.json().catch(() => null)) as any;
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
      const txt = await res.text().catch(() => "");
      return { success: false, message: `Error eliminando santo (${res.status}). ${txt}` };
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
  const res = await fetch(`${baseUrl}/saints/${saintId}/miracles`, { cache: "no-store", credentials: "include" });
    if (!res.ok) return [];
  const data = (await res.json()) as MiracleApi[];
  return data.map(mapApiToFormMiracle);
}

export async function createMiracle(saintId: string, formData: MiracleFormData): Promise<MiracleFormData> {
  const baseUrl = getBaseUrl();
  const payload = mapFormToApiMiracle(formData);

  const res = await fetch(`${baseUrl}/saints/${saintId}/miracles`, {
    method: "POST",
    headers: withAdminKey({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("createMiracle failed", res.status, txt);
      return { ...formData, id: "", saintId };
    }
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
    headers: withAdminKey({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(payload),
  });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("updateMiracle failed", res.status, txt);
      return { ...formData, id: formData.id || miracleId };
    }

  return res.json();
}

export async function deleteMiracle(miracleId: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/miracles/${miracleId}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) { const txt = await res.text().catch(() => ""); console.error("admin-utils request failed", res.status, txt); return null as any; }
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
  const baseUrl = getBaseUrl()
  const res = await fetch(`${baseUrl}/prayers`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Error cargando oraciones (${res.status})`)
  return res.json()
}

export async function getApprovedPrayers(): Promise<PrayerApi[]> {
  const baseUrl = getBaseUrl()
  const res = await fetch(`${baseUrl}/prayers/approved`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Error cargando oraciones aprobadas (${res.status})`)
  return res.json()
}

export async function createPrayer(formData: PrayerFormData): Promise<PrayerApi> {
  const baseUrl = getBaseUrl()
  const res = await fetch(`${baseUrl}/prayers`, {
    method: "POST",
    headers: withAdminKey({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(formData),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`Error creando oraciÃ³n (${res.status}). ${txt}`)
  }
  return res.json()
}

export async function updatePrayer(prayerId: string, formData: Partial<PrayerFormData>): Promise<PrayerApi> {
  const baseUrl = getBaseUrl()
  const res = await fetch(`${baseUrl}/prayers/${prayerId}`, {
    method: "PATCH",
    headers: withAdminKey({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(formData),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`Error editando oraciÃ³n (${res.status}). ${txt}`)
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
    const txt = await res.text().catch(() => "")
    throw new Error(`Error eliminando oraciÃ³n (${res.status}). ${txt}`)
  }
}

