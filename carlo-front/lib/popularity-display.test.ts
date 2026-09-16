import { expect, it } from "vitest"
import { validPopularityEstimate } from "./popularity-display"
const estimate = { score: 72, generatedAt: "2026-09-14T12:00:00Z", model: "test-model", methodologyVersion: "1", inputHash: "a".repeat(64) }
it("displays only traceable numeric estimates", () => {
  expect(validPopularityEstimate(estimate)).toBe(true)
  expect(validPopularityEstimate(null)).toBe(false)
  for (const score of [-1, 101, NaN, 0.3]) expect(validPopularityEstimate({ ...estimate, score })).toBe(false)
  expect(validPopularityEstimate({ ...estimate, model: "" })).toBe(false)
  expect(validPopularityEstimate({ ...estimate, generatedAt: "bad date" })).toBe(false)
  expect(validPopularityEstimate({ ...estimate, inputHash: "" })).toBe(false)
})
