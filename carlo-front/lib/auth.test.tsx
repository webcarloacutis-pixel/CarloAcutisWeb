// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './auth'
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done});return {promise,resolve}}
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
describe('admin session response ordering',()=>{
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
