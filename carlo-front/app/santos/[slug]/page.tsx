export const dynamic = "force-dynamic"
export const revalidate = 0
import { notFound } from "next/navigation"
import { SaintDetail } from "@/components/saint-detail"
import type { Saint } from "@/components/saint-detail"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { apiUrl } from "@/lib/api-url"
import { fetchPublicCollection } from "@/lib/public-collection"
import { publicRequest } from "@/lib/public-request"
type MiracleApi = { id: string; title: string; details: string | null; date: string | null; location: string | null; approved: boolean }
type PrayerApi = { id: string; title: string; content: string; saintName: string | null; occasion: string | null; approved: boolean }
async function getSaint(slug: string): Promise<Saint> {
  const response = await publicRequest(apiUrl("/saints/" + encodeURIComponent(slug)), { cache: "no-store" }, fetch, true)
  if (response.status === 404) notFound()
  if (!response.ok) throw new Error("No se pudo cargar el santo.")
  const api = await response.json()
  const [miracles, prayers] = await Promise.all([
    fetchPublicCollection<MiracleApi>(apiUrl("/saints/" + encodeURIComponent(api.id) + "/miracles"), { cache: "no-store" }),
    fetchPublicCollection<PrayerApi>(apiUrl("/prayers/approved"), { cache: "no-store" }),
  ])
  return {
    ...api,
    image: api.imageUrl || api.image || null,
    patronOf: Array.isArray(api.patronOf) ? api.patronOf : [],
    symbols: Array.isArray(api.symbols) ? api.symbols : [],
    prayers: prayers.filter(prayer => prayer.approved && prayer.saintName?.trim().toLocaleLowerCase("es") === api.name.trim().toLocaleLowerCase("es")).map(prayer => ({ id: prayer.id, title: prayer.title, text: prayer.content, occasion: prayer.occasion })),
    miracles: miracles.map((miracle) => ({ id: miracle.id, title: miracle.title, description: miracle.details || "", date: miracle.date, location: miracle.location, verified: miracle.approved })),
  }
}
export default async function SaintPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const saint = await getSaint(slug)
  return <div className="min-h-screen bg-background"><Header /><main><SaintDetail saint={saint} /></main><Footer /></div>
}
