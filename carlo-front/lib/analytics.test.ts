import { describe,it,expect } from 'vitest'
import { analyticsPath,analyticsPayload } from './analytics'
const config={enabled:true,collector:'http://127.0.0.1:4300/api/send',website:'00000000-0000-4000-8000-000000000001',domains:['localhost']}
describe('analytics privacy allowlist',()=>{
  it('strips query and fragment and aggregates saint IDs',()=>{
    expect(analyticsPath('/oraciones?busqueda=PRIVATE#TOKEN')).toBe('/oraciones')
    expect(analyticsPath('/santos/some-name')).toBe('/santos/detalle')
  })
  it('excludes administration, sessions, conversations and unknown routes',()=>{
    for(const path of ['/admin','/sanctum/portal','/conversations/private','/auth/login','/unknown'])expect(analyticsPath(path)).toBeNull()
  })
  it('sends only the documented public fields',()=>{
    const payload=analyticsPayload(config,'/oraciones?email=PRIVATE#TOKEN',{hostname:'localhost'},{width:390,height:844},'es-CO')
    expect(payload).toEqual({type:'event',payload:{website:config.website,hostname:'localhost',url:'/oraciones',referrer:'',screen:'390x844',language:'es'}})
    expect(JSON.stringify(payload)).not.toMatch(/PRIVATE|TOKEN|email|title|account|search/)
  })
  it('fails closed while disabled or on an unapproved hostname',()=>{
    expect(analyticsPayload({...config,enabled:false},'/',{hostname:'localhost'},{width:1,height:1},'es')).toBeNull()
    expect(analyticsPayload(config,'/',{hostname:'evil.test'},{width:1,height:1},'es')).toBeNull()
  })
})
