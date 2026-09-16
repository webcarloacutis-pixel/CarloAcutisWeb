"use client"
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { analyticsPayload, type AnalyticsConfig } from '@/lib/analytics'
let lastNavigation=''
export function VisitAnalytics() {
  const [config,setConfig]=useState<AnalyticsConfig|null>(null)
  useEffect(()=>{
    const controller=new AbortController()
    void fetch('/api/analytics-config',{credentials:'omit',signal:controller.signal}).then(r=>r.ok?r.json():null).then(value=>{if(value)setConfig(value)}).catch(()=>{})
    return ()=>controller.abort()
  },[])
  const pathname=usePathname()
  useEffect(()=>{
    if(!config)return
    const key=config.website+':'+pathname
    if(lastNavigation===key)return
    lastNavigation=key
    const payload=analyticsPayload(config,pathname,window.location,window.screen,navigator.language)
    if(!payload)return
    // Manual Umami pageview: no SDK/autocapture, title, query, fragment or account data.
    void fetch(config.collector,{method:'POST',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true,signal:AbortSignal.timeout(3000)}).catch(()=>{})
  },[pathname,config])
  return null
}
