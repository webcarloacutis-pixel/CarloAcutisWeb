import { validPopularityEstimate, type PopularityEstimateData } from "@/lib/popularity-display"
import { T } from "@/components/t"
export function PopularityEstimate({ estimate }: { estimate?: PopularityEstimateData | null }) {
  return <div className="text-xs text-muted-foreground space-y-1">
    <p>{validPopularityEstimate(estimate) ? <T k="chrome.popularityScore" values={{score:estimate.score}} /> : <T k="chrome.popularityMissing" />}</p>
    {validPopularityEstimate(estimate) && <p><T k="chrome.popularityHelp" values={{model:estimate.model,method:estimate.methodologyVersion,date:new Date(estimate.generatedAt).toISOString().slice(0, 10)}} /></p>}
  </div>
}
