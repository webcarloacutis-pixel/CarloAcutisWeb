import {afterEach,expect,it,vi} from 'vitest'
vi.mock('./api-url',()=>({apiUrl:(path:string)=>'/api'+path}))
import {postAiChat,chatErrorKey,recentChatContext} from './ai-client'
import {chatTranslations} from './chat-translations'
afterEach(()=>vi.unstubAllGlobals())
it('keeps a database outage distinct from provider rate limiting',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:'DATABASE_UNAVAILABLE'},{status:503})))
  await expect(postAiChat({message:'Synthetic'})).rejects.toMatchObject({code:'DATABASE_UNAVAILABLE',status:503})
  expect(chatErrorKey({code:'DATABASE_UNAVAILABLE',status:503})).toBe('catalog.temporarilyUnavailable')
})
it.each([
 ['RATE_LIMITED',429,'chat.rateLimit'],
 ['AI_BUSY',429,'chat.busy'],
 ['AI_REQUEST_IN_PROGRESS',429,'chat.inProgress'],
 ['AI_REQUEST_CONFLICT',409,'chat.requestConflict'],
 ['NOT_AUTHENTICATED',401,'chat.sessionExpired'],
 ['AUTH_NOT_CONFIGURED',503,'catalog.temporarilyUnavailable'],
] as const)('retains the safe %s code instead of attributing a local rejection to the provider',async(code,status,key)=>{
 const fetcher=vi.fn().mockResolvedValue(Response.json({error:code,message:'private diagnostic'},{status}));vi.stubGlobal('fetch',fetcher)
 let failure:unknown
 try {await postAiChat({message:'Synthetic'})}catch(error){failure=error}
 expect(failure).toMatchObject({code,status,message:'AI request failed'})
 expect(chatErrorKey(failure)).toBe(key)
 expect(fetcher).toHaveBeenCalledOnce()
})
it('preserves the safe application code and sends one correlated request',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({error:'AI_PROVIDER_AUTH',message:'private provider credential details'}),{status:502}));vi.stubGlobal('fetch',fetcher)
 await expect(postAiChat({message:'Synthetic',lang:'fr'})).rejects.toMatchObject({code:'AI_PROVIDER_AUTH',status:502,message:'AI request failed'})
 expect(fetcher).toHaveBeenCalledOnce();expect(fetcher.mock.calls[0][1].headers['X-Request-Id']).toMatch(/^[a-f0-9-]{36}$/)
})
it.each([{answer:{unsafe:'object'}},null,[],{answer:''}])('rejects malformed successful responses without persisting them: %j',async(payload)=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify(payload),{status:200})))
 await expect(postAiChat({message:'Synthetic'})).rejects.toMatchObject({code:'AI_RESPONSE_INVALID'})
})
it('uses translation keys for errors instead of storing translated sentences',()=>{
 expect(chatErrorKey({code:'AI_DISABLED'})).toBe('chat.disabled');expect(chatErrorKey({code:'AI_PERSISTENCE_FAILED'})).toBe('chat.persistence');expect(chatErrorKey({code:'AI_TIMEOUT'})).toBe('chat.timeout')
})
it('provides capacity, pending and request-conflict feedback in every existing chat language',()=>{
 expect(Object.keys(chatTranslations)).toHaveLength(15)
 for(const [language,entries] of Object.entries(chatTranslations))for(const key of ['chat.busy','chat.inProgress','chat.requestConflict']){
  expect(entries[key],language+':'+key).toBeTruthy()
  expect(entries[key]).not.toBe(key)
 }
})
it('bounds recent linguistic context and includes the last answer for ambiguous follow-ups',()=>{
 expect(recentChatContext([{role:'user',content:'older'},{role:'user',content:'Responde en portugués'},{role:'assistant',content:'A oração é um diálogo com Deus.'},{role:'user',content:'OK'},{role:'system',content:'not accepted'}])).toEqual(['Responde en portugués','A oração é um diálogo com Deus.','OK'])
 expect(recentChatContext([{role:'assistant',content:'x'.repeat(2000)}])[0]).toHaveLength(1000)
})
