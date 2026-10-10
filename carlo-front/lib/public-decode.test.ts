import { afterEach, expect, it, vi } from 'vitest'
import { publicRequest, publicJson, publicContractError } from './public-request'
afterEach(() => vi.restoreAllMocks())
it('classifies malformed JSON without logging body, host, or secrets and preserves requestId', async () => {
  const info=vi.spyOn(console,'info').mockImplementation(()=>{}),error=vi.spyOn(console,'error').mockImplementation(()=>{})
  const response=await publicRequest('https://private-host.invalid',{},vi.fn().mockResolvedValue(new Response('secret-password-invalid-json',{headers:{'Content-Type':'application/json'}})))
  await expect(publicJson(response)).rejects.toMatchObject({code:'CATALOG_JSON_INVALID',requestId:info.mock.calls[0][1].requestId})
  expect(error.mock.calls[0][1]).toMatchObject({stage:'DECODE',httpStatus:200,code:'CATALOG_JSON_INVALID'})
  expect(JSON.stringify([...info.mock.calls,...error.mock.calls])).not.toMatch(/private-host|secret-password/)
})
it('separates JSON decoding from shape validation', async()=>{
  vi.spyOn(console,'error').mockImplementation(()=>{})
  const response=Response.json({name:null})
  expect(await publicJson(response)).toEqual({name:null})
  expect(()=>publicContractError(response)).toThrowError(expect.objectContaining({code:'CATALOG_CONTRACT_INVALID'}))
})
it.each(['text/html','text/plain',''])('rejects %s before parsing a plausible JSON body',async(contentType)=>{
  vi.spyOn(console,'error').mockImplementation(()=>{})
  const response=new Response('{"id":"looks-valid"}',{headers:contentType?{'Content-Type':contentType}:{}})
  const decode=vi.spyOn(response,'json')
  await expect(publicJson(response)).rejects.toMatchObject({code:'CATALOG_CONTENT_TYPE_INVALID'})
  expect(decode).not.toHaveBeenCalled()
})
it('accepts the JSON structured suffix with charset',async()=>expect(await publicJson(new Response('{"id":"ok"}',{headers:{'Content-Type':'application/problem+json; charset=utf-8'}}))).toEqual({id:'ok'}))
