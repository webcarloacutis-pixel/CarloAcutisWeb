import { afterEach, expect, it, vi } from "vitest"
import { publicRequest, PUBLIC_READ_TIMEOUT_MS } from "./public-request"
afterEach(()=>vi.restoreAllMocks())
it("allows an 18 second backend response instead of cutting off at 15 seconds",async()=>{
  const timer=vi.spyOn(AbortSignal,'timeout').mockReturnValue(new AbortController().signal)
  const fetcher=vi.fn().mockResolvedValue(Response.json([{id:'real-response'}]))
  await publicRequest('http://example.invalid/saints',{},fetcher)
  expect(timer).toHaveBeenCalledWith(PUBLIC_READ_TIMEOUT_MS)
  expect(PUBLIC_READ_TIMEOUT_MS).toBeGreaterThan(18000)
  expect(PUBLIC_READ_TIMEOUT_MS).toBeLessThanOrEqual(35000)
})
it("keeps HTTP failure separate, emits only safe correlation fields, and allows recovery",async()=>{
  const log=vi.spyOn(console,'info').mockImplementation(()=>{})
  const fetcher=vi.fn().mockResolvedValueOnce(new Response('private upstream failure',{status:502})).mockResolvedValueOnce(Response.json([{id:'one'}]))
  await expect(publicRequest('http://private-host.invalid/saints',{},fetcher)).rejects.toMatchObject({code:'CATALOG_HTTP_ERROR'})
  expect(await (await publicRequest('http://private-host.invalid/saints',{},fetcher)).json()).toEqual([{id:'one'}])
  expect(JSON.stringify(log.mock.calls)).not.toContain('private')
  expect(log.mock.calls[0][1]).toMatchObject({stage:'SERVER_READ',code:'CATALOG_HTTP_ERROR',httpStatus:502})
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it("never turns network failure into an empty catalog or logs an error message",async()=>{
  const log=vi.spyOn(console,'info').mockImplementation(()=>{})
  await expect(publicRequest('http://example.invalid',{},vi.fn().mockRejectedValue(new Error('secret credential')))).rejects.toMatchObject({code:'CATALOG_UNAVAILABLE'})
  expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret|credential/)
})
