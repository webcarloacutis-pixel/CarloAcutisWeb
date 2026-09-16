import { apiUrl } from './api-url'
type ApiError=Error & {status?:number}
// No automatic retries of chargeable user operations.
export async function withBackoff<T>(fn:()=>Promise<T>, _max=1) { return fn() }
async function post(path:string,body:unknown,signal?:AbortSignal) {
  const response=await fetch(apiUrl(path),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',cache:'no-store',body:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(35000)]):AbortSignal.timeout(35000)})
  if(!response.ok){const error=new Error('No se pudo completar la solicitud de IA.') as ApiError;error.status=response.status;throw error}
  return response.json()
}
export async function postAiChat(params:{message:string;lang?:string;sessionId?:string;requestId?:string},signal?:AbortSignal):Promise<{answer:string}> {return post('/ai/chat',{...params,requestId:params.requestId||crypto.randomUUID()},signal)}
export async function postAiTranslate(params:{text:string;targetLang:string},signal?:AbortSignal):Promise<{text?:string;translation?:string;translated?:string}> {return post('/ai/translate',params,signal)}
