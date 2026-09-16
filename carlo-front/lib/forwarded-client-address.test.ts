import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/[...path]/route'
import { forwardedClientAddress } from './forwarded-client-address'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('verified ingress client forwarding', () => {
  it('stays disabled unless explicitly enabled', () => {
    for (const enabled of [undefined, 'false', '1', 'TRUE']) expect(forwardedClientAddress('192.0.2.1', enabled)).toBeUndefined()
  })
  it('takes only the appended rightmost literal and admits bare IPv4/IPv6', () => {
    expect(forwardedClientAddress('198.51.100.1, 192.0.2.1', 'true')).toBe('192.0.2.1')
    expect(forwardedClientAddress('spoofed, 2001:0db8::1', 'true')).toBe('2001:0db8::1')
    expect(forwardedClientAddress('::ffff:192.0.2.1', 'true')).toBe('::ffff:192.0.2.1')
  })
  it('rejects invalid final hops without trusting an earlier client-supplied value', () => {
    for (const bad of ['', 'face', '1.2.3.999', '192.0.2.1:80', '[2001:db8::1]:80', 'fe80::1%lo', '1.2.3.4.5', '::::']) {
      expect(forwardedClientAddress('192.0.2.1, '+bad, 'true')).toBeUndefined()
    }
    expect(forwardedClientAddress('1'.repeat(4097), 'true')).toBeUndefined()
  })
  it('the actual proxy forwards no administrative or other identity headers', async () => {
    vi.stubEnv('BACKEND_URL', 'http://127.0.0.1:4100')
    vi.stubEnv('FORWARD_TRUSTED_IP', 'true')
    const upstream = vi.fn(async (_url: unknown, options: RequestInit) => {
      const headers = new Headers(options.headers)
      expect(headers.get('x-forwarded-for')).toBe('192.0.2.1')
      for (const header of ['x-admin-key', 'authorization', 'x-real-ip', 'forwarded', 'x-forwarded-host', 'x-forwarded-proto']) expect(headers.has(header)).toBe(false)
      return Response.json({ok:true})
    })
    vi.stubGlobal('fetch', upstream)
    const request = new NextRequest('https://localhost/api/health', {headers:{'x-forwarded-for':'spoofed, 192.0.2.1','x-admin-key':'unit-test-not-a-real-secret','authorization':'Bearer fake','x-real-ip':'203.0.113.1','forwarded':'for=203.0.113.1','x-forwarded-host':'evil.invalid','x-forwarded-proto':'http'}})
    expect((await GET(request, {params:Promise.resolve({path:['health']})})).status).toBe(200)
    expect(upstream).toHaveBeenCalledOnce()
  })
  it('the actual proxy drops malformed forwarding rather than transmitting it', async () => {
    vi.stubEnv('BACKEND_URL', 'http://127.0.0.1:4100')
    vi.stubEnv('FORWARD_TRUSTED_IP', 'true')
    const upstream=vi.fn(async (_url:unknown, options:RequestInit)=> {
      expect(new Headers(options.headers).has('x-forwarded-for')).toBe(false)
      return Response.json({ok:true})
    })
    vi.stubGlobal('fetch', upstream)
    const request=new NextRequest('https://localhost/api/health',{headers:{'x-forwarded-for':'192.0.2.1, face'}})
    expect((await GET(request,{params:Promise.resolve({path:['health']})})).status).toBe(200)
    expect(upstream).toHaveBeenCalledOnce()
  })
})
