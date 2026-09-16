export type PopularityEstimateData = {
  score: number; generatedAt: string; model: string; methodologyVersion: string; inputHash: string
}
export function validPopularityEstimate(value: PopularityEstimateData | null | undefined): value is PopularityEstimateData {
  return Boolean(value && Number.isInteger(value.score) && value.score >= 0 && value.score <= 100 &&
    value.model?.trim() && value.methodologyVersion?.trim() && /^[a-f0-9]{64}$/i.test(value.inputHash || "") &&
    Number.isFinite(Date.parse(value.generatedAt)))
}
