import {afterEach,expect,it,vi} from 'vitest'
vi.mock('./api-url',()=>({apiUrl:(path:string)=>'/api'+path}))
import {postAiChat,chatErrorKey,recentChatContext} from './ai-client'
afterEach(()=>vi.unstubAllGlobals())
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
it('bounds recent linguistic context and includes the last answer for ambiguous follow-ups',()=>{
 expect(recentChatContext([{role:'user',content:'older'},{role:'user',content:'Responde en portugués'},{role:'assistant',content:'A oração é um diálogo com Deus.'},{role:'user',content:'OK'},{role:'system',content:'not accepted'}])).toEqual(['Responde en portugués','A oração é um diálogo com Deus.','OK'])
 expect(recentChatContext([{role:'assistant',content:'x'.repeat(2000)}])[0]).toHaveLength(1000)
})
