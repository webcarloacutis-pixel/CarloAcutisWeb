import { apiUrl } from './api-url'
export type AiErrorCode='AI_DISABLED'|'AI_CONFIGURATION_MISSING'|'AI_PROVIDER_AUTH'|'AI_MODEL_UNAVAILABLE'|'AI_RATE_LIMIT'|'AI_QUOTA_EXCEEDED'|'AI_TIMEOUT'|'AI_UPSTREAM_UNAVAILABLE'|'AI_RESPONSE_INVALID'|'AI_PERSISTENCE_FAILED'
export type ApiError=Error & {status?:number;code?:AiErrorCode;requestId?:string}
const codes=new Set<AiErrorCode>(['AI_DISABLED','AI_CONFIGURATION_MISSING','AI_PROVIDER_AUTH','AI_MODEL_UNAVAILABLE','AI_RATE_LIMIT','AI_QUOTA_EXCEEDED','AI_TIMEOUT','AI_UPSTREAM_UNAVAILABLE','AI_RESPONSE_INVALID','AI_PERSISTENCE_FAILED'])
export function chatErrorKey(error:unknown) {
  const code=(error as ApiError)?.code
  const keys:Partial<Record<AiErrorCode,string>>={AI_DISABLED:'chat.disabled',AI_CONFIGURATION_MISSING:'chat.configuration',AI_PROVIDER_AUTH:'chat.providerAuth',AI_MODEL_UNAVAILABLE:'chat.modelUnavailable',AI_RATE_LIMIT:'chat.rateLimit',AI_QUOTA_EXCEEDED:'chat.quota',AI_TIMEOUT:'chat.timeout',AI_RESPONSE_INVALID:'chat.invalid',AI_PERSISTENCE_FAILED:'chat.persistence'}
  return (code && keys[code]) || ((error as ApiError)?.status===429?'chat.rateLimit':'chat.unavailable')
}
// No automatic retries of chargeable user operations.
export async function withBackoff<T>(fn:()=>Promise<T>, _max=1) { return fn() }
async function post(path:string,body:unknown,signal?:AbortSignal) {
  const requestId=crypto.randomUUID()
  let response:Response
  try {response=await fetch(apiUrl(path),{method:'POST',headers:{'Content-Type':'application/json','X-Request-Id':requestId},credentials:'include',cache:'no-store',body:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(35000)]):AbortSignal.timeout(35000)})}
  catch(error){if(signal?.aborted)throw error;throw Object.assign(new Error('AI request failed'),{code:(error as Error)?.name==='TimeoutError'?'AI_TIMEOUT':'AI_UPSTREAM_UNAVAILABLE',requestId})}
  let payload:Record<string,unknown>
  try {payload=await response.json()}catch {throw Object.assign(new Error('AI response invalid'),{code:'AI_RESPONSE_INVALID',requestId})}
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Object.assign(new Error('AI response invalid'),{code:'AI_RESPONSE_INVALID',requestId})
  if(!response.ok){const code=codes.has(payload?.error as AiErrorCode)?payload.error:response.status===429?'AI_RATE_LIMIT':'AI_UPSTREAM_UNAVAILABLE';throw Object.assign(new Error('AI request failed'),{status:response.status,code,requestId})}
  return payload
}
export function recentChatContext(messages:ReadonlyArray<{role:string;content:string}>) {
  return messages.filter(message=>(message.role==='user'||message.role==='assistant') && message.content.trim()).slice(-3).map(message=>message.content.slice(0,1000))
}
export async function postAiChat(params:{message:string;lang?:string;sessionId?:string;requestId?:string;recentMessages?:string[]},signal?:AbortSignal):Promise<{answer:string}> {
  const payload=await post('/ai/chat',{...params,requestId:params.requestId||crypto.randomUUID()},signal)
  if(typeof payload.answer!=='string'||!payload.answer.trim()||payload.answer.length>16000)throw Object.assign(new Error('AI response invalid'),{code:'AI_RESPONSE_INVALID'})
  return {answer:payload.answer}
}
export async function postAiTranslate(params:{text:string;targetLang:string},signal?:AbortSignal):Promise<{text?:string;translation?:string;translated?:string}> {return post('/ai/translate',params,signal) as Promise<{text?:string;translation?:string;translated?:string}>}
