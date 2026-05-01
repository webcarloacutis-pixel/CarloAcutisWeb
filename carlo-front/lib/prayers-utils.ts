
function withAdminKey(headers: Record<string, string>) {
  const k = process.env.NEXT_PUBLIC_ADMIN_KEY;
  return k ? { ...headers, "x-admin-key": k } : headers;
}

export type PrayerApi = {
  id: string
  title: string
  content: string
  category: string | null
  approved: boolean
  createdAt: string
  updatedAt: string
}

export type PrayerFormData = {
  title: string
  content: string
  category?: string | null
  approved?: boolean
}

type PrayerPatchData = Partial<PrayerFormData>

function getBaseUrl() {
  return ('').trim()
}

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status} ${txt}`.trim())
  }
  return res.json()
}

export async function getPrayers(): Promise<PrayerApi[]> {
  const base = getBaseUrl()
  const res = await fetch(`${base}/prayers`, { cache: "no-store" })
  return (await jsonOrThrow(res)) as PrayerApi[]
}

export async function getApprovedPrayers(): Promise<PrayerApi[]> {
  const base = getBaseUrl()
  const res = await fetch(`${base}/prayers/approved`, { cache: "no-store" })
  return (await jsonOrThrow(res)) as PrayerApi[]
}

export async function createPrayer(data: PrayerFormData): Promise<PrayerApi> {
  const base = getBaseUrl()
  const res = await fetch(`${base}/prayers`, {
    method: "POST",
    headers: withAdminKey({ "Content-Type": "application/json", ...(process.env.NEXT_PUBLIC_ADMIN_KEY ? { "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_KEY } : {}) }),
    body: JSON.stringify(data),
  })
  return (await jsonOrThrow(res)) as PrayerApi
}

export async function updatePrayer(id: string, data: PrayerPatchData): Promise<PrayerApi> {
  const base = getBaseUrl()
  const res = await fetch(`${base}/prayers/${id}`, {
    method: "PATCH",
    headers: withAdminKey({ "Content-Type": "application/json", ...(process.env.NEXT_PUBLIC_ADMIN_KEY ? { "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_KEY } : {}) }),
    body: JSON.stringify(data),
  })
  return (await jsonOrThrow(res)) as PrayerApi
}

export async function deletePrayer(id: string): Promise<void> {
  const base = getBaseUrl()
  const res = await fetch(`${base}/prayers/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status} ${txt}`.trim())
  }
}

