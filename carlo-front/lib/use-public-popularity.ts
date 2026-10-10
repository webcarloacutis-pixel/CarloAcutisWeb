"use client"
import { useEffect,useState } from 'react'
import { fetchPublicCollection } from './public-collection'
import { validPopularityEstimate,type PopularityEstimateData } from './popularity-display'
import { catalogErrorKey } from './public-request'
/** Optional public scores load after real content; GET only, no generation/provider call. */
export function usePublicPopularity(kind:'prayer'|'verse',enabled=true){
 const [state,setState]=useState<{kind:string;estimates:Record<string,PopularityEstimateData>;error:string|null}>({kind:'',estimates:{},error:null})
 const [attempt,setAttempt]=useState(0)
 useEffect(()=>{
  if(!enabled)return
  const controller=new AbortController()
  void fetchPublicCollection<PopularityEstimateData&{id:string;contentId:string}>('/api/popularity?kind='+kind,{cache:'no-store',credentials:'omit',signal:controller.signal})
   .then(rows=>{if(!controller.signal.aborted)setState({kind,estimates:Object.fromEntries(rows.filter(row=>validPopularityEstimate(row)&&row.contentId).map(row=>[row.contentId,row])),error:null})})
   .catch(error=>{if(!controller.signal.aborted)setState({kind,estimates:{},error:catalogErrorKey(error)})})
  return()=>controller.abort()
 },[kind,enabled,attempt])
 return{estimates:state.kind===kind?state.estimates:{},error:state.kind===kind?state.error:null,canRetry:attempt<2,retry:()=>{if(attempt<2)setAttempt(value=>value+1)}}
}
