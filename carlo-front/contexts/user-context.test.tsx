// @vitest-environment jsdom
import React from 'react'
import { LanguageProvider } from './language-context'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UserProvider, useUser, type ChatMessage } from './user-context'
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done});return {promise,resolve}}
const when='2026-09-14T12:00:00.000Z'
const account={id:'account-a',email:'synthetic-a@example.invalid',name:null}
const conversation={id:'conv-a',title:'Synthetic history',createdAt:when,updatedAt:when}
const first={id:'m1',role:'user' as const,content:'Synthetic saved message',createdAt:when}
const message=(id:string):ChatMessage=>({id,role:'user',content:'Synthetic '+id,timestamp:new Date(when)})
function response(body:unknown,status=200,headers?:HeadersInit){return new Response(JSON.stringify(body),{status,headers})}
function setup(override?:(url:string,init:RequestInit)=>Promise<Response>|undefined){
  const fetcher=vi.fn((input:string,init:RequestInit={})=>{
    const replaced=override?.(input,init);if(replaced)return replaced
    if(input.endsWith('/auth/me'))return Promise.resolve(response({},401))
    if(input.endsWith('/auth/login'))return Promise.resolve(response({user:account}))
    if(input.endsWith('/auth/logout'))return Promise.resolve(response({ok:true}))
    if(input.startsWith('/api/conversations?'))return Promise.resolve(response({conversations:[conversation]}))
    if(input.includes('/messages') && (!init.method || init.method==='GET'))return Promise.resolve(response({messages:[first]}))
    return Promise.resolve(response({ok:true}))
  })
  vi.stubGlobal('fetch',fetcher)
  return {fetcher,...renderHook(()=>useUser(),{wrapper:({children})=><LanguageProvider><UserProvider>{children}</UserProvider></LanguageProvider>})}
}
async function login(result:{current:ReturnType<typeof useUser>}){
  await waitFor(()=>expect(result.current.loading).toBe(false))
  await act(async()=>{expect(await result.current.login('synthetic-a@example.invalid','synthetic-password')).toBe(true)})
}
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
describe('private history request ordering and persistence',()=>{
  it('does not replace a completed append with an older message snapshot',async()=>{
    let delay=false;const old=deferred<Response>()
    const {result}=setup((url,init)=>delay && url.includes('/messages') && !init.method?old.promise:undefined)
    await login(result);expect(result.current.user?.name).toBe('')
    delay=true
    let selection!:Promise<void>;act(()=>{selection=result.current.selectConversation('conv-a')})
    const messages=[{...first,timestamp:new Date(first.createdAt)},message('m2')]
    await act(async()=>{expect(await result.current.updateConversation('conv-a',messages)).toBe(true)})
    await act(async()=>{old.resolve(response({messages:[first]}));await selection})
    expect(result.current.currentConversation?.messages.map(m=>m.id)).toEqual(['m1','m2'])
  })
  it('does not continue an old account pagination after a new account signs in',async()=>{
    const page=deferred<unknown>();let oldRead=false
    const {result,fetcher}=setup((url,init)=>{
      if(oldRead && url.includes('/conv-a/messages') && !init.method)return Promise.resolve({ok:true,status:200,headers:new Headers({'x-next-cursor':'old-account-cursor'}),json:()=>page.promise} as Response)
      if(oldRead && url.endsWith('/auth/login'))return Promise.resolve(response({user:{id:'account-b',email:'synthetic-b@example.invalid',name:'B'}}))
      if(oldRead && url.startsWith('/api/conversations?'))return Promise.resolve(response({conversations:[]}))
    })
    await login(result);oldRead=true
    let selection!:Promise<void>;act(()=>{selection=result.current.selectConversation('conv-a')})
    await act(async()=>{await Promise.resolve()})
    await act(async()=>{expect(await result.current.login('synthetic-b@example.invalid','synthetic-password')).toBe(true)})
    await act(async()=>{page.resolve({messages:[first]});await selection})
    expect(result.current.user?.id).toBe('account-b')
    expect(result.current.conversations).toEqual([])
    expect(fetcher.mock.calls.some(([url])=>url.includes('old-account-cursor'))).toBe(false)
  })
  it('sends only new IDs and retries only the unconfirmed message after a partial failure',async()=>{
    let failed=false
    const {result,fetcher}=setup((url,init)=>{
      if(url.includes('/messages') && init.method==='POST' && JSON.parse(String(init.body)).id==='m3' && !failed){failed=true;return Promise.resolve(response({},503))}
    })
    await login(result)
    const messages=[{...first,timestamp:new Date(first.createdAt)},message('m2'),message('m3')]
    await act(async()=>{expect(await result.current.updateConversation('conv-a',messages)).toBe(false)})
    await act(async()=>{expect(await result.current.updateConversation('conv-a',messages)).toBe(true)})
    const ids=fetcher.mock.calls.filter(([url,init])=>url.includes('/messages') && init.method==='POST').map(([,init])=>JSON.parse(String(init.body)).id)
    expect(ids).toEqual(['m2','m3','m3'])
  })
  it('stops pending and queued writes after logout even when fetch resolves despite abort',async()=>{
    const pending=deferred<Response>();let started=false
    const {result,fetcher}=setup((url,init)=>{
      if(url.includes('/messages') && init.method==='POST'){started=true;return pending.promise}
    })
    await login(result)
    let firstWrite!:Promise<boolean>,secondWrite!:Promise<boolean>
    act(()=>{firstWrite=result.current.updateConversation('conv-a',[message('m2'),message('m3')]);secondWrite=result.current.updateConversation('conv-a',[message('m4')])})
    await waitFor(()=>expect(started).toBe(true))
    await act(async()=>{expect(await result.current.logout()).toBe(true)})
    await act(async()=>{pending.resolve(response({ok:true}));expect(await firstWrite).toBe(false);expect(await secondWrite).toBe(false)})
    expect(result.current.user).toBeNull()
    expect(result.current.conversations).toEqual([])
    expect(fetcher.mock.calls.filter(([url,init])=>url.includes('/messages') && init.method==='POST')).toHaveLength(1)
  })
  it('keeps successful authentication separate from failed history loading',async()=>{
    const {result}=setup(url=>url.startsWith('/api/conversations?')?Promise.resolve(response({},503)):undefined)
    await login(result)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.error.toLowerCase()).toContain('no se pudo cargar el historial')
    expect(result.current.loading).toBe(false)
  })
  it('finishes loading when authentication expires while hydrating history',async()=>{
    const {result}=setup(url=>url.startsWith('/api/conversations?')?Promise.resolve(response({},401)):undefined)
    await waitFor(()=>expect(result.current.loading).toBe(false))
    await act(async()=>{expect(await result.current.login('synthetic-a@example.invalid','synthetic-password')).toBe(false)})
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toContain('La sesión terminó')
  })
  it('reports an unavailable initial session service',async()=>{
    const {result}=setup(url=>url.endsWith('/auth/me')?Promise.resolve(response({},503)):undefined)
    await waitFor(()=>expect(result.current.loading).toBe(false))
    expect(result.current.error).toContain('No se pudo comprobar la sesión')
  })
})
