import { afterEach,expect,it,vi } from 'vitest'
import PrayersPage from '@/app/oraciones/page'
import VersesPage from '@/app/versiculos/page'
vi.mock('@/lib/api-url',()=>({apiUrl:(path:string)=>'https://synthetic.invalid'+path}))
vi.mock('@/lib/public-collection',()=>({fetchPublicCollection:async()=>[{id:'synthetic-prayer',title:'Existing prayer',content:'Readable full prayer.',approved:true}]}))
vi.mock('@/lib/popularity-read',()=>({getPopularityEstimates:()=>new Promise(()=>{})}))
afterEach(()=>vi.useRealTimers())
it.each(['prayers','verses'])('does not wait for an unavailable optional popularity service before rendering %s',async(kind)=>{
 vi.useFakeTimers()
 const rendering=kind==='prayers'?PrayersPage({searchParams:Promise.resolve({})}):VersesPage()
 const bounded=Promise.race([rendering.then(value=>({value})),new Promise(resolve=>setTimeout(()=>resolve({blockedByOptionalData:true}),1000))])
 await vi.advanceTimersByTimeAsync(1000)
 expect(await bounded).toMatchObject({value:expect.anything()})
})
