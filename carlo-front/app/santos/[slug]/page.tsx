export const dynamic = "force-dynamic"
export const revalidate = 0
import { notFound } from "next/navigation"
import { SaintDetail } from "@/components/saint-detail"
import type { Saint } from "@/components/saint-detail"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { apiUrl } from "@/lib/api-url"
import { publicRequest, publicJson, publicContractError } from "@/lib/public-request"
import { catalogReturn } from "@/lib/catalog-return"
async function getSaint(slug: string): Promise<Saint> {
  const response = await publicRequest(apiUrl("/saints/" + encodeURIComponent(slug)), { cache: "no-store" }, fetch, true)
  if (response.status === 404) notFound()
  if (!response.ok) throw new Error("No se pudo cargar el santo.")
  const raw = await publicJson(response)
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !("id" in raw) || typeof raw.id !== "string" ||
      !("slug" in raw) || typeof raw.slug !== "string" || !("name" in raw) || typeof raw.name !== "string" || !raw.name.trim()) publicContractError(response)
  const api = raw as Saint & { imageUrl?: string | null }
  return {
    ...api,
    image: api.imageUrl || api.image || null,
    patronOf: Array.isArray(api.patronOf) ? api.patronOf : [],
    symbols: Array.isArray(api.symbols) ? api.symbols : [],
  }
}
export default async function SaintPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params
  const saint = await getSaint(slug)
  const returnTo = catalogReturn((await searchParams)?.returnTo)
  return <div className="min-h-screen bg-background"><Header /><main><SaintDetail saint={saint} returnTo={returnTo} /></main><Footer /></div>
}
