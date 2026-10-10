import { expect, type Page, type TestInfo } from '@playwright/test'

/** Observe normal local release journeys; injected failure tests opt out explicitly. */
export function observeReleaseNetwork(page: Page) {
  const unexpected: { path: string; status?: number; error?: string }[] = []
  let responses = 0
  let cancelled = 0
  page.on('response', response => {
    responses++
    if (response.status() === 429 || response.status() >= 500) {
      unexpected.push({ path: new URL(response.url()).pathname, status: response.status() })
    }
  })
  page.on('requestfailed', request => {
    const error = request.failure()?.errorText || 'REQUEST_FAILED'
    // Navigation and our stale-request cancellation legitimately abort prefetches.
    if (/ERR_ABORTED|NS_BINDING_ABORTED|cancelled|canceled/i.test(error)) cancelled++
    else unexpected.push({ path: new URL(request.url()).pathname, error })
  })
  return { unexpected, counts: () => ({ responses, cancelled }) }
}

export async function assertReleaseNetwork(observation: ReturnType<typeof observeReleaseNetwork>, info: TestInfo) {
  await info.attach('normal-journey-network', { contentType: 'application/json', body: JSON.stringify({ ...observation.counts(), unexpected: observation.unexpected }) })
  expect(observation.unexpected, 'No unexpected HTTP429/5xx or failed network request in the normal journey').toEqual([])
}
