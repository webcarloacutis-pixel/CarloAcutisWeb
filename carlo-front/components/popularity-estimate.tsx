import { validPopularityEstimate, type PopularityEstimateData } from "@/lib/popularity-display"
export function PopularityEstimate({ estimate }: { estimate?: PopularityEstimateData | null }) {
  return <div className="text-xs text-muted-foreground space-y-1">
    <p>{validPopularityEstimate(estimate) ? "Popularidad estimada por IA: " + estimate.score + "/100" : "Popularidad estimada por IA: sin estimación disponible"}</p>
    {validPopularityEstimate(estimate) && <p>Estimación editorial de familiaridad cultural; no mide visitas, votos ni eficacia. Modelo: {estimate.model}. Método: {estimate.methodologyVersion}. Fecha: {new Date(estimate.generatedAt).toISOString().slice(0, 10)}.</p>}
  </div>
}
