import { apiUrl } from "./api-url"
import { fetchPublicCollection } from "./public-collection"
import { validPopularityEstimate, type PopularityEstimateData } from "./popularity-display"
export async function getPopularityEstimates(kind: "prayer" | "verse"): Promise<Record<string, PopularityEstimateData>> {
  try {
    const rows = await fetchPublicCollection<PopularityEstimateData & { id: string; contentId: string }>(apiUrl("/popularity?kind=" + kind), { cache: "no-store" })
    return Object.fromEntries(rows.filter((row) => validPopularityEstimate(row) && row.contentId).map((row) => [row.contentId, row]))
  } catch {
    return {}
  }
}
