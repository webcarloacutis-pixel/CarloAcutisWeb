import { getAnalyticsConfig } from '@/lib/analytics-config'
export const dynamic='force-dynamic'
export function GET(){return Response.json(getAnalyticsConfig(),{headers:{'Cache-Control':'public, max-age=60'}})}
