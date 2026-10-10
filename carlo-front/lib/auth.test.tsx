// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './auth'
import { translations } from './translations'
const locale = vi.hoisted(() => ({ language: 'es' }))
vi.mock('@/contexts/language-context', () => ({ useLanguage: () => ({ language: locale.language, t: (key: string) => translations[locale.language][key] ?? key }) }))
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done});return {promise,resolve}}
afterEach(()=>{cleanup();vi.unstubAllGlobals();locale.language='es'})
describe('admin session response ordering',()=>{
  it.each([[401,'catalog.accessDenied'],[429,'catalog.rateLimited'],[503,'catalog.temporarilyUnavailable']])('distinguishes administrative login failure %i in the active language',async(status,key)=>{
    locale.language='fr'
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.endsWith('/me')?new Response('{}',{status:401}):new Response('private provider detail',{status:Number(status)})))
    const {result}=renderHook(()=>useAuth(),{wrapper:AuthProvider})
    await waitFor(()=>expect(result.current.loading).toBe(false))
    await act(async()=>{expect(await result.current.login('synthetic-password')).toBe(false)})
    expect(result.current.error).toBe(translations.fr[String(key)])
    expect(result.current.isAuthenticated).toBe(false)
  })
  it('translates administrative errors on a language change without repeating the session request',async()=>{
    const fetcher=vi.fn(async()=>{throw new Error('private backend detail')})
    vi.stubGlobal('fetch',fetcher)
    const {result,rerender}=renderHook(()=>useAuth(),{wrapper:AuthProvider})
    await waitFor(()=>expect(result.current.error).toBe(translations.es['supplemental.adminSessionFailed']))
    locale.language='fr';rerender()
    expect(result.current.error).toBe(translations.fr['supplemental.adminSessionFailed'])
    expect(result.current.error).not.toContain('private backend detail')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('ignores a late unauthenticated probe after successful login',async()=>{
    const probe=deferred<Response>()
    vi.stubGlobal('fetch',vi.fn((url:string)=>url.endsWith('/me')?probe.promise:Promise.resolve(new Response('{}'))))
    const {result}=renderHook(()=>useAuth(),{wrapper:AuthProvider})
    await act(async()=>{expect(await result.current.login('synthetic-password')).toBe(true)})
    await act(async()=>{probe.resolve(new Response('{}',{status:401}))})
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.loading).toBe(false)
  })
  it('ignores a late authenticated probe after successful logout',async()=>{
    const probe=deferred<Response>()
    vi.stubGlobal('fetch',vi.fn((url:string)=>url.endsWith('/me')?probe.promise:Promise.resolve(new Response('{}'))))
    const {result}=renderHook(()=>useAuth(),{wrapper:AuthProvider})
    await act(async()=>{expect(await result.current.logout()).toBe(true)})
    await act(async()=>{probe.resolve(new Response('{}'))})
    expect(result.current.isAuthenticated).toBe(false)
  })
  it('serializes cookie mutations and reports failed logout without claiming success',async()=>{
    const pending=deferred<Response>()
    const fetcher=vi.fn((url:string)=>url.endsWith('/me')?Promise.resolve(new Response('{}')):pending.promise)
    vi.stubGlobal('fetch',fetcher)
    const {result}=renderHook(()=>useAuth(),{wrapper:AuthProvider})
    await waitFor(()=>expect(result.current.loading).toBe(false))
    let logout!:Promise<boolean>
    act(()=>{logout=result.current.logout()})
    await act(async()=>{expect(await result.current.login('another-password')).toBe(false)})
    await act(async()=>{pending.resolve(new Response('{}',{status:503}));expect(await logout).toBe(false)})
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.error).not.toBe('')
  })
})
