import 'server-only'
import type { AnalyticsConfig } from './analytics'
export function getAnalyticsConfig():AnalyticsConfig {
  const disabled={enabled:false,collector:'',website:'',domains:[]}
  if(process.env.ANALYTICS_ENABLED!=='true')return disabled
  const website=process.env.UMAMI_WEBSITE_ID||''
  const domains=(process.env.UMAMI_ALLOWED_HOSTS||'').split(',').map(s=>s.trim()).filter(Boolean)
  try{
    const collector=new URL(process.env.UMAMI_COLLECTOR_URL||'')
    const local=process.env.ANALYTICS_LOCAL_TEST==='true' && ['127.0.0.1','localhost'].includes(collector.hostname)
    if((collector.protocol!=='https:' && !local) || collector.pathname!=='/api/send' || collector.search || collector.hash || collector.username || collector.password || !/^[a-f0-9-]{36}$/i.test(website) || !domains.length)return disabled
    return {enabled:true,collector:collector.href,website,domains}
  }catch{return disabled}
}
