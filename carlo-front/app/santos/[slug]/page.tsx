export const dynamic = "force-dynamic"
export const revalidate = 0
import { notFound } from "next/navigation"
import { SaintDetail } from "@/components/saint-detail"
import type { Saint } from "@/components/saint-detail"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { apiUrl } from "@/lib/api-url"
import { fetchPublicCollection } from "@/lib/public-collection"
import { publicRequest, publicJson, publicContractError } from "@/lib/public-request"
type PrayerApi = { id: string; title: string; content: string; saintName: string | null; occasion: string | null; approved: boolean }
async function getSaint(slug: string): Promise<Saint> {
  const response = await publicRequest(apiUrl("/saints/" + encodeURIComponent(slug)), { cache: "no-store" }, fetch, true)
  if (response.status === 404) notFound()
  if (!response.ok) throw new Error("No se pudo cargar el santo.")
  const raw = await publicJson(response)
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !("id" in raw) || typeof raw.id !== "string" ||
      !("slug" in raw) || typeof raw.slug !== "string" || !("name" in raw) || typeof raw.name !== "string" || !raw.name.trim()) publicContractError(response)
  const api = raw as Saint & { imageUrl?: string | null }
  const prayers = await fetchPublicCollection<PrayerApi>(apiUrl("/prayers/approved"), { cache: "no-store" });
  return {
    ...api,
    image: api.imageUrl || api.image || null,
    patronOf: Array.isArray(api.patronOf) ? api.patronOf : [],
    symbols: Array.isArray(api.symbols) ? api.symbols : [],
    prayers: prayers.filter(prayer => prayer.approved && prayer.saintName?.trim().toLocaleLowerCase("es") === api.name.trim().toLocaleLowerCase("es")).map(prayer => ({ id: prayer.id, title: prayer.title, text: prayer.content, occasion: prayer.occasion })),
  }
}
export default async function SaintPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const saint = await getSaint(slug)
  return <div className="min-h-screen bg-background"><Header /><main><SaintDetail saint={saint} /></main><Footer /></div>
}
